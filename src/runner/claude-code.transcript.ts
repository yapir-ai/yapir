import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKTaskNotificationMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { DynamicToolUIPart, UIMessage } from "ai";

import type { HarnessInput } from "./harness";

type Parts = UIMessage["parts"];

type ContentBlock = SDKAssistantMessage["message"]["content"][number];

// Claude Code streams each block of a model response as its own message, and runs the tools meanwhile.
// A response is complete when the next one starts, or when the turn ends.
export function claudeCodeTranscript(record: HarnessInput["record"]) {
  let response: { id: string; parts: Parts } | undefined;
  const tools = new Map<string, DynamicToolUIPart>();
  const subagents = new Map<string, Parts>();
  // Background subagents that ended, after the response that started them.
  const subagentEnds: DynamicToolUIPart[] = [];

  function flush() {
    if (response) {
      record("assistant", response.parts);
      response = undefined;
    }

    for (const tool of subagentEnds.splice(0)) {
      record("assistant", [tool]);
    }
  }

  function responseParts(id: string) {
    if (response?.id !== id) {
      flush();
      response = { id, parts: [] };
    }

    return response.parts;
  }

  function subagentParts(toolCallId: string) {
    const parts = subagents.get(toolCallId) ?? [];
    subagents.set(toolCallId, parts);

    return parts;
  }

  function part(block: ContentBlock): Parts[number] | undefined {
    if (block.type === "text") {
      return { type: "text", text: block.text, state: "done" };
    }

    if (block.type === "thinking") {
      return { type: "reasoning", text: block.thinking, state: "done" };
    }

    if (block.type === "tool_use") {
      const tool: DynamicToolUIPart = {
        type: "dynamic-tool",
        toolName: block.name,
        toolCallId: block.id,
        state: "input-available",
        input: block.input,
      };

      tools.set(block.id, tool);

      return tool;
    }
  }

  function addResponse({
    parent_tool_use_id: parent,
    message: { id, content },
  }: SDKAssistantMessage) {
    const parts = parent === null ? responseParts(id) : subagentParts(parent);

    for (const block of content) {
      const added = part(block);

      if (added) {
        parts.push(added);
      }
    }
  }

  function addToolResults({ message: { content } }: SDKUserMessage) {
    if (!Array.isArray(content)) {
      return;
    }

    for (const block of content) {
      if (block.type === "tool_result") {
        const work = subagents.get(block.tool_use_id);
        Object.assign(
          tools.get(block.tool_use_id)!,
          block.is_error
            ? { state: "output-error", errorText: text(block.content) }
            : {
                state: "output-available",
                output: work ? { parts: work } : block.content,
              }
        );
      }
    }
  }

  // A background subagent ends after its tool call returned: its work comes as a message of its own.
  function addSubagentEnd({
    tool_use_id: toolCallId,
  }: SDKTaskNotificationMessage) {
    const tool = toolCallId && tools.get(toolCallId);
    const work = toolCallId && subagents.get(toolCallId);

    if (tool && work && tool.state === "output-available") {
      subagentEnds.push({ ...tool, output: { parts: work } });
    }
  }

  return function add(message: SDKMessage) {
    if (message.type === "assistant") {
      addResponse(message);
    } else if (message.type === "user") {
      addToolResults(message);
    } else if (
      message.type === "system" &&
      message.subtype === "task_notification"
    ) {
      addSubagentEnd(message);
    } else if (message.type === "result") {
      flush();
    }
  };
}

function text(
  content: string | ({ type: string } & Partial<{ text: string }>)[] | undefined
) {
  return Array.isArray(content)
    ? content.map((block) => block.text ?? "").join("\n")
    : (content ?? "");
}
