import type {
  OpenCodeClient,
  SessionMessageAssistant,
  SessionMessageInfo,
} from "@opencode/client";
import type { UIMessage } from "ai";
import { z } from "zod";

import type { HarnessInput } from "./harness";

type Parts = UIMessage["parts"];

// A subagent works in its own session.
const SubagentMetadata = z.object({ sessionID: z.string() });

// OpenCode ends a step once its tools completed: each step is a message of the transcript.
export function opencodeTranscript(
  client: OpenCodeClient,
  sessionID: string,
  record: HarnessInput["record"]
) {
  async function recordStep(messageID: string) {
    const message = await client.session.message.get({ sessionID, messageID });
    record("assistant", await parts(message));
  }

  async function parts(message: SessionMessageInfo): Promise<Parts> {
    return message.type === "assistant"
      ? await Promise.all(message.content.map(part))
      : [];
  }

  async function part(
    content: SessionMessageAssistant["content"][number]
  ): Promise<Parts[number]> {
    if (content.type === "text") {
      return { type: "text", text: content.text, state: "done" };
    }

    if (content.type === "reasoning") {
      return { type: "reasoning", text: content.text, state: "done" };
    }

    const { id, name, state } = content;

    const tool = {
      type: "dynamic-tool",
      toolCallId: id,
      toolName: name,
      input: state.input,
    } as const;

    if (state.status === "error") {
      return {
        ...tool,
        state: "output-error",
        errorText: state.error.message,
      };
    }

    if (state.status !== "completed") {
      return { ...tool, state: "input-available" };
    }

    return {
      ...tool,
      state: "output-available",
      output:
        name === "subagent"
          ? {
              parts: await sessionParts(
                SubagentMetadata.parse(state.metadata).sessionID
              ),
            }
          : state.content,
    };
  }

  async function sessionParts(id: string) {
    const messages = [];
    // The cursor carries the order of the first page.
    let page = await client.message.list({ sessionID: id, order: "asc" });
    messages.push(...page.data);

    while (page.cursor.next) {
      page = await client.message.list({
        sessionID: id,
        cursor: page.cursor.next,
      });
      messages.push(...page.data);
    }

    return (await Promise.all(messages.map(parts))).flat();
  }

  return recordStep;
}
