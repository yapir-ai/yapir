import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { Codex } from "@openai/codex-sdk";
import type { ModelReasoningEffort, Usage, UserInput } from "@openai/codex-sdk";
import type { ExecutionUsageDto } from "@server/lib/executions/execution-pull.dto";

import { codexPart } from "./codex.transcript";
import type { Harness } from "./harness";
import { agentKey } from "./proxy";
import { workspaceDirectory } from "./workspace";

// The image installs the SDK's native package there: the compiled runner cannot carry it.
const executable = "/opt/codex/bin/codex";

// Codex names its threads itself: HOME keeps the task's thread ID next to Codex's storage.
const threadFile = path.join(homedir(), ".yapir/codex-thread");

// Codex keeps each thread in a rollout file named after its ID, in a folder of its start date.
const sessionDirectory = path.join(homedir(), ".codex/sessions");

export const codexHarness: Harness = {
  skillsDirectory: ".agents/skills",
  async open({ model, mcpUrl, instructions, record }) {
    const codex = new Codex({
      codexPathOverride: executable,
      apiKey: agentKey,
      config: {
        // A custom provider talks HTTP: the proxy forwards no WebSocket.
        model_provider: "yapir",
        model_providers: {
          yapir: {
            name: "Yapir",
            base_url: model.baseUrl,
            env_key: "CODEX_API_KEY",
            wire_api: "responses",
          },
        },
        mcp_servers: { yapir: { url: mcpUrl } },
        developer_instructions: instructions,
        // Plugins sync a marketplace clone into HOME, which the environment archives every execution.
        features: { plugins: false },
      },
    });

    const options = {
      model: model.id,
      // SAFETY: Codex validates the effort, a free value.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      modelReasoningEffort: (model.effort ?? undefined) as
        | ModelReasoningEffort
        | undefined,
      // The workspace holds the repositories, but is not one itself.
      workingDirectory: workspaceDirectory,
      skipGitRepoCheck: true,
      // The execution environment confines the agent.
      sandboxMode: "danger-full-access",
      approvalPolicy: "never",
    } as const;

    const resumed = existsSync(threadFile);

    const thread = resumed
      ? codex.resumeThread(await readFile(threadFile, "utf-8"), options)
      : codex.startThread(options);

    // Codex reports the thread's usage, which includes the previous executions, only when a turn ends.
    // Its rollout counts the tokens after each model response.
    async function threadUsage() {
      const tokenCount = (await readFile(await rolloutFile(), "utf-8"))
        .split("\n")
        .findLast((line) => line.includes('"total_token_usage"'));

      if (tokenCount === undefined) {
        return;
      }

      // SAFETY: Codex writes its token counts in this format.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const { payload } = JSON.parse(tokenCount) as TokenCount;

      return payload.info.total_token_usage;
    }

    async function rolloutFile() {
      const [file] = await Array.fromAsync(
        new Bun.Glob(`**/rollout-*-${thread.id}.jsonl`).scan(sessionDirectory)
      );

      return path.join(sessionDirectory, file!);
    }

    const previousUsage = resumed ? await threadUsage() : undefined;

    async function executionUsage(): Promise<ExecutionUsageDto> {
      const usage = thread.id === null ? undefined : await threadUsage();

      if (!usage) {
        return [];
      }

      const delta = (key: keyof Usage) =>
        usage[key] - (previousUsage?.[key] ?? 0);

      return [
        {
          model: model.id,
          // Codex counts the cache reads and writes in its input tokens.
          inputTokens:
            delta("input_tokens") -
            delta("cached_input_tokens") -
            delta("cache_write_input_tokens"),
          outputTokens: delta("output_tokens"),
          cacheReadTokens: delta("cached_input_tokens"),
          cacheWriteTokens: delta("cache_write_input_tokens"),
        },
      ];
    }

    const controller = new AbortController();
    // Codex takes no text during a turn: the texts wait for the next one.
    const waiting: string[] = [];
    let running = false;
    let turns: Promise<void> | undefined;

    async function runTurns() {
      running = true;

      while (waiting.length > 0) {
        const texts = waiting.splice(0);

        for (const text of texts) {
          record("user", [{ type: "text", text }]);
        }

        await runTurn(texts.map((text) => ({ type: "text", text })));
      }

      running = false;
    }

    async function runTurn(input: UserInput[]) {
      const { events } = await thread.runStreamed(input, {
        signal: controller.signal,
      });

      for await (const event of events) {
        if (event.type === "thread.started") {
          // A failed turn keeps the thread: the next execution resumes it.
          await mkdir(path.dirname(threadFile), { recursive: true });
          await writeFile(threadFile, event.thread_id);
        } else if (event.type === "item.completed") {
          const part = codexPart(event.item);

          if (part) {
            record("assistant", [part]);
          }
        } else if (event.type === "turn.failed") {
          throw new Error(event.error.message);
        }
      }
    }

    return {
      send(text) {
        waiting.push(text);

        if (!running) {
          turns = runTurns();
        }
      },
      idle: async () => await turns!,
      usage: executionUsage,
      async export() {
        return {
          sessionId: thread.id!,
          content: await readFile(await rolloutFile(), "utf-8"),
        };
      },
      // Interrupts the running turn, for example on a lost lease.
      async [Symbol.asyncDispose]() {
        controller.abort();
        await Promise.allSettled([turns]);
      },
    };
  },
};

interface TokenCount {
  payload: { info: { total_token_usage: Usage } };
}
