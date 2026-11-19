import { randomUUID } from "node:crypto";
import path from "node:path";

import { isSessionNotFoundError, OpenCode } from "@opencode/client";
import { Service } from "@opencode/client/service";

import type { Harness } from "./harness";
import { harnessInbox } from "./harness-inbox";
import { opencodeTranscript } from "./opencode.transcript";
import { agentKey } from "./proxy";
import { workspaceDirectory } from "./workspace";

// The project skill directories that OpenCode knows.
const skillDirectories = [
  ".opencode/skills",
  ".claude/skills",
  ".agents/skills",
];

export const opencodeHarness: Harness = {
  skillsDirectory: ".agents/skills",
  async open({
    taskId,
    model,
    mcpUrl,
    instructions,
    repositoryDirectories,
    record,
  }) {
    const endpoint = await Service.ensure({
      env: {
        OPENCODE_CONFIG_CONTENT: JSON.stringify({
          // OpenCode searches skills from its working directory upwards: the repositories' are below it.
          skills: repositoryDirectories.flatMap((directory) =>
            skillDirectories.map((skills) => path.join(directory, skills))
          ),
          mcp: {
            servers: {
              yapir: { type: "remote", url: mcpUrl, oauth: false },
            },
          },
          // The catalog provider keeps its models.dev definition; only its endpoints and key change.
          providers: {
            [model.catalogId]: {
              settings: {
                baseURL: model.baseUrl,
                apiKey: agentKey,
                // The proxy forwards HTTP only.
                transport: "http",
              },
              models: Object.fromEntries(
                Object.entries(model.endpoints).map(([id, baseURL]) => [
                  id,
                  { settings: { baseURL } },
                ])
              ),
            },
          },
        }),
      },
    });

    const client = OpenCode.make({
      baseUrl: endpoint.url,
      headers: Service.headers(endpoint),
      // The event stream stays silent while the model thinks: Bun's idle timeout would cut it.
      fetch: Object.assign(
        async (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
          await fetch(input, { ...init, timeout: false }),
        { preconnect: fetch.preconnect }
      ),
    });

    // OpenCode's storage in HOME keeps the session when the environment restored it.
    const sessionID = `ses_${taskId}`;

    try {
      await client.session.get({ sessionID });
    } catch (error) {
      if (!isSessionNotFoundError(error)) {
        throw error;
      }

      await client.session.create({
        id: sessionID,
        // OpenCode names its variants after the catalog's effort levels.
        model: {
          providerID: model.catalogId,
          id: model.id,
          variant: model.effort ?? undefined,
        },
        location: { directory: workspaceDirectory },
        permissions: [{ action: "*", resource: "*", effect: "allow" }],
      });
    }

    await client.experimental.session.instructions.entry.put({
      sessionID,
      key: "yapir",
      value: instructions,
    });

    // OpenCode's stats count the messages created since then: the execution's, subagents included.
    const openedAt = Date.now();
    const recordStep = opencodeTranscript(client, sessionID, record);
    const inbox = harnessInbox();
    const controller = new AbortController();
    const subscription = client.event.subscribe({ signal: controller.signal });
    const events = subscription[Symbol.asyncIterator]();
    // The first event confirms the subscription, before the first prompt.
    await events.next();

    async function follow(): Promise<never> {
      for (
        let next = await events.next();
        !next.done;
        next = await events.next()
      ) {
        const event = next.value;

        if (
          !("sessionID" in event.data) ||
          event.data.sessionID !== sessionID
        ) {
          continue;
        }

        if (event.type === "session.step.ended") {
          await recordStep(event.data.assistantMessageID);
        } else if (event.type === "session.inbox.delivered") {
          const text = inbox.read(event.data.inboxID);

          if (text !== undefined) {
            record("user", [{ type: "text", text }]);
          }
        } else if (event.type === "session.execution.succeeded") {
          inbox.turnEnded();
        } else if (event.type === "session.execution.failed") {
          throw new Error(`OpenCode turn failed: ${event.data.error.message}`);
        } else if (event.type === "session.execution.interrupted") {
          throw new Error(`OpenCode turn ended with ${event.type}`);
        }
      }

      throw new Error("OpenCode stopped");
    }

    async function executionUsage() {
      const { models } = await client.session.stats({ from: openedAt });

      return models.map(({ model: { id }, tokens }) => ({
        model: id,
        inputTokens: tokens.input,
        // OpenCode counts the reasoning apart from the output.
        outputTokens: tokens.output + tokens.reasoning,
        cacheReadTokens: tokens.cache.read,
        cacheWriteTokens: tokens.cache.write,
      }));
    }

    const following = follow();

    return {
      send(text) {
        // OpenCode's inbox IDs start with msg_: the harness sets its own to recognize the delivery.
        const id = `msg_${randomUUID()}`;
        inbox.add(id, text);
        void client.session.prompt({ sessionID, id, text });
      },
      idle: async () => await Promise.race([inbox.idle(), following]),
      usage: executionUsage,
      async export() {
        return {
          sessionId: sessionID,
          content: JSON.stringify(await client.session.export({ sessionID })),
        };
      },
      async [Symbol.asyncDispose]() {
        controller.abort();
        await Promise.allSettled([following]);
        await Service.stop();
      },
    };
  },
};
