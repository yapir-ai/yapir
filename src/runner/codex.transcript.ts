import type { ThreadItem } from "@openai/codex-sdk";
import type { DynamicToolUIPart, UIMessage } from "ai";

type Outcome = { output: unknown } | { errorText: string };

const tool = (
  { id }: ThreadItem,
  toolName: string,
  input: DynamicToolUIPart["input"],
  outcome: Outcome
) =>
  ({
    type: "dynamic-tool",
    toolCallId: id,
    toolName,
    input,
    ...("errorText" in outcome
      ? { state: "output-error", errorText: outcome.errorText }
      : { state: "output-available", output: outcome.output }),
  }) satisfies DynamicToolUIPart;

export function codexPart(
  item: ThreadItem
): UIMessage["parts"][number] | undefined {
  if (item.type === "agent_message") {
    return { type: "text", text: item.text, state: "done" };
  }

  if (item.type === "reasoning") {
    return { type: "reasoning", text: item.text, state: "done" };
  }

  if (item.type === "command_execution") {
    return tool(
      item,
      "command",
      { command: item.command },
      item.status === "failed"
        ? { errorText: item.aggregated_output }
        : {
            output: {
              output: item.aggregated_output,
              exitCode: item.exit_code,
            },
          }
    );
  }

  if (item.type === "file_change") {
    return tool(
      item,
      "file_change",
      { changes: item.changes },
      item.status === "failed"
        ? { errorText: "The patch failed" }
        : { output: null }
    );
  }

  if (item.type === "mcp_tool_call") {
    return tool(
      item,
      `mcp__${item.server}__${item.tool}`,
      item.arguments,
      item.error ? { errorText: item.error.message } : { output: item.result }
    );
  }

  if (item.type === "web_search") {
    return tool(item, "web_search", { query: item.query }, { output: null });
  }

  if (item.type === "todo_list") {
    return tool(item, "todo_list", { items: item.items }, { output: null });
  }
}
