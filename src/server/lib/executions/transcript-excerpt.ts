import type { DynamicToolUIPart, UIMessage } from "ai";
import { z } from "zod";

export const TranscriptBounds = z.object({
  maxPartLength: z
    .number()
    .int()
    .min(0)
    .max(20_000)
    .default(2000)
    .describe(
      "Characters kept of each text, reasoning, tool input and tool output"
    ),
  toolOutputs: z
    .boolean()
    .default(false)
    .describe(
      "Include the outputs of tool calls: what the agent read, such as files and command outputs"
    ),
});

type Bounds = z.infer<typeof TranscriptBounds>;

interface Excerpt {
  text: string;
  omitted: number;
}

// `input` and `output` are excerpts of their JSON; `output` holds the error of a failed call.
interface ToolPart {
  type: "tool";
  toolName: string;
  state: DynamicToolUIPart["state"];
  input: Excerpt;
  output?: Excerpt;
}

type TranscriptPart = ({ type: "text" | "reasoning" } & Excerpt) | ToolPart;

const excerpt = (text: string, maxLength: number): Excerpt => ({
  text: text.slice(0, maxLength),
  omitted: Math.max(text.length - maxLength, 0),
});

function toolOutput(part: DynamicToolUIPart) {
  if (part.state === "output-available") {
    return JSON.stringify(part.output);
  }

  if (part.state === "output-error") {
    return part.errorText;
  }
}

function excerptPart(
  part: UIMessage["parts"][number],
  { maxPartLength, toolOutputs }: Bounds
): TranscriptPart[] {
  if (part.type === "text" || part.type === "reasoning") {
    return [{ type: part.type, ...excerpt(part.text, maxPartLength) }];
  }

  if (part.type === "dynamic-tool") {
    const tool: ToolPart = {
      type: "tool",
      toolName: part.toolName,
      state: part.state,
      input: excerpt(JSON.stringify(part.input), maxPartLength),
    };

    const output = toolOutput(part);

    if (toolOutputs && output !== undefined) {
      tool.output = excerpt(output, maxPartLength);
    }

    return [tool];
  }

  return [];
}

// Keeps the text, reasoning and tool parts: the parts that the harness adapters record.
export function excerptMessage({ role, parts }: UIMessage, bounds: Bounds) {
  return {
    role,
    parts: parts.flatMap((part) => excerptPart(part, bounds)),
  };
}
