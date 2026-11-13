import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { getSessionInfo, query } from "@anthropic-ai/claude-agent-sdk";
import type {
  EffortLevel,
  ModelUsage,
  SDKPartialAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { ExecutionUsageDto } from "@server/lib/executions/execution-pull.dto";

import { claudeCodeTranscript } from "./claude-code.transcript";
import type { Harness } from "./harness";
import { harnessInbox } from "./harness-inbox";
import { agentKey } from "./proxy";
import { workspaceDirectory } from "./workspace";

// The image installs the SDK's native binary there: the compiled runner cannot carry it.
const executable = "/usr/local/bin/claude";

// Claude Code reports the session's usage, which includes the previous executions: HOME keeps its last report.
const usageFile = path.join(homedir(), ".yapir/claude-code-usage.json");

// Claude Code keeps the sessions of a directory in a folder named after its path, each other character replaced.
const sessionDirectory = path.join(
  homedir(),
  ".claude/projects",
  workspaceDirectory.replaceAll(/[^a-zA-Z0-9]/gu, "-")
);

export const claudeCodeHarness: Harness = {
  skillsDirectory: ".claude/skills",
  async open({
    taskId,
    model,
    mcpUrl,
    instructions,
    repositoryDirectories,
    record,
  }) {
    // Claude Code's storage in HOME keeps the session when the environment restored it.
    const started =
      (await getSessionInfo(taskId, { dir: workspaceDirectory })) !== undefined;

    const previousUsage =
      started && existsSync(usageFile) ? await readUsage() : {};

    // Claude Code reports the session's usage when a turn ends: until then, the streamed responses give the turn's.
    let sessionUsage = previousUsage;
    let turnUsage: ExecutionUsageDto = [];
    // The response that each agent streams, the main agent's under null.
    const streaming = new Map<string | null, ExecutionUsageDto[number]>();

    const controller = new AbortController();
    const inbox = harnessInbox();
    const prompts = new TransformStream<SDKUserMessage>();
    const writer = prompts.writable.getWriter();

    const messages = query({
      prompt: prompts.readable,
      options: {
        pathToClaudeCodeExecutable: executable,
        cwd: workspaceDirectory,
        // Claude Code loads their skills, not their settings: only the working directory holds those.
        additionalDirectories: repositoryDirectories,
        model: model.id,
        // SAFETY: Claude Code falls back to its default effort on an unknown value.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        effort: (model.effort ?? undefined) as EffortLevel | undefined,
        ...(started ? { resume: taskId } : { sessionId: taskId }),
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: instructions,
        },
        // The execution environment confines the agent.
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        mcpServers: { yapir: { type: "http", url: mcpUrl } },
        // Claude Code omits the text of the model's thinking by default.
        extraArgs: { "thinking-display": "summarized" },
        includePartialMessages: true,
        abortController: controller,
        env: {
          ...process.env,
          // Claude Code appends /v1 to its base URL itself.
          ANTHROPIC_BASE_URL: model.baseUrl.replace(/\/v1$/u, ""),
          ANTHROPIC_API_KEY: agentKey,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        },
      },
    });

    async function follow(): Promise<never> {
      const transcript = claudeCodeTranscript(record);

      for await (const message of messages) {
        transcript(message);

        if (message.type === "stream_event") {
          countTokens(message);
        }

        if (
          message.type === "result" &&
          (message.subtype !== "success" || message.is_error)
        ) {
          const details =
            message.subtype === "success"
              ? message.result
              : `${message.subtype}: ${message.errors.join("\n")}`;

          throw new Error(`Claude Code turn failed: ${details}`);
        }

        if (message.type === "result") {
          for (const uuid of message.user_message_uuids ?? []) {
            inbox.read(uuid);
          }

          await mkdir(path.dirname(usageFile), { recursive: true });
          await writeFile(usageFile, JSON.stringify(message.modelUsage));
          sessionUsage = message.modelUsage;
          turnUsage = [];
          inbox.turnEnded();
        }
      }

      throw new Error("Claude Code stopped");
    }

    function countTokens({
      event,
      parent_tool_use_id: agent,
    }: SDKPartialAssistantMessage) {
      if (event.type === "message_start") {
        const { usage } = event.message;

        const tokens = {
          model: event.message.model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        };

        turnUsage.push(tokens);
        streaming.set(agent, tokens);
      } else if (event.type === "message_delta") {
        streaming.get(agent)!.outputTokens = event.usage.output_tokens;
      }
    }

    function executionUsage() {
      const endedTurnsUsage = Object.entries(sessionUsage).map(
        ([id, usage]) => {
          const previous = previousUsage[id];

          return {
            model: id,
            inputTokens: usage.inputTokens - (previous?.inputTokens ?? 0),
            outputTokens: usage.outputTokens - (previous?.outputTokens ?? 0),
            cacheReadTokens:
              usage.cacheReadInputTokens -
              (previous?.cacheReadInputTokens ?? 0),
            cacheWriteTokens:
              usage.cacheCreationInputTokens -
              (previous?.cacheCreationInputTokens ?? 0),
          };
        }
      );

      return [...endedTurnsUsage, ...turnUsage];
    }

    const following = follow();

    return {
      send(text) {
        const uuid = randomUUID();
        inbox.add(uuid, text);
        // Claude Code tells which texts a turn read only once it ends.
        record("user", [{ type: "text", text }]);
        // Claude Code reads it after the tool calls it runs. Without a human origin, the model takes it for their output.
        void writer.write({
          type: "user",
          message: { role: "user", content: text },
          parent_tool_use_id: null,
          uuid,
          origin: { kind: "human" },
        });
      },
      idle: async () => await Promise.race([inbox.idle(), following]),
      // oxlint-disable-next-line eslint/require-await The harness contract returns a promise.
      usage: async () => executionUsage(),
      async export() {
        return {
          sessionId: taskId,
          content: await readFile(
            path.join(sessionDirectory, `${taskId}.jsonl`),
            "utf-8"
          ),
        };
      },
      // Interrupts the running turn, for example on a lost lease.
      async [Symbol.asyncDispose]() {
        controller.abort();
        await Promise.allSettled([following]);
      },
    };
  },
};

async function readUsage() {
  const usage = await readFile(usageFile, "utf-8");

  // SAFETY: the adapter writes this file from Claude Code's report.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return JSON.parse(usage) as Record<string, ModelUsage>;
}
