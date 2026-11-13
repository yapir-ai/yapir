import { Markdown } from "@web/components/markdown";
import { ReasoningTraceLine } from "@web/components/reasoning-trace-line";
import { Code } from "@web/components/ui/code";
import { CodeBlock, CodeBlockContent } from "@web/components/ui/code-block";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@web/components/ui/trace";
import type { DynamicToolUIPart, UIMessage } from "ai";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { z } from "zod";

type Part = UIMessage["parts"][number];

const ShellInput = z.object({ command: z.string() });

const SubagentOutput = z.object({ parts: z.array(z.custom<Part>()) });

// Tool outputs are often the model's content blocks.
const TextBlocks = z.array(
  z.object({ type: z.literal("text"), text: z.string() })
);

// A background subagent's end repeats its tool call, with its work: it replaces the call.
export function transcriptParts(messages: UIMessage[]) {
  const parts: Part[] = [];
  const toolIndexes = new Map<string, number>();

  for (const part of messages.flatMap(
    ({ parts: messageParts }) => messageParts
  )) {
    const index =
      part.type === "dynamic-tool"
        ? toolIndexes.get(part.toolCallId)
        : undefined;

    if (index === undefined) {
      if (part.type === "dynamic-tool") {
        toolIndexes.set(part.toolCallId, parts.length);
      }

      parts.push(part);
    } else {
      parts[index] = part;
    }
  }

  return parts;
}

export function ExecutionTranscript({
  parts,
  running,
}: {
  parts: Part[];
  running: boolean;
}) {
  return (
    <Trace>
      {parts.map((part, index) => (
        <TranscriptStep key={index} part={part} running={running} />
      ))}
    </Trace>
  );
}

function TranscriptStep({ part, running }: { part: Part; running: boolean }) {
  if (part.type === "reasoning") {
    return <ReasoningTraceLine text={part.text} running={false} />;
  }

  if (part.type === "text") {
    return (
      <Markdown className="text-muted-foreground text-xs">{part.text}</Markdown>
    );
  }

  if (part.type === "dynamic-tool") {
    return <ToolTraceLine part={part} running={running} />;
  }
}

function ToolTraceLine({
  part,
  running,
}: {
  part: DynamicToolUIPart;
  running: boolean;
}) {
  const command = ShellInput.safeParse(part.input);
  const call = `${part.toolName} ${command.success ? command.data.command : JSON.stringify(part.input)}`;

  if (part.state === "output-error") {
    return (
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="error">
            <TraceIcon>
              <CircleAlertIcon />
            </TraceIcon>
            <TraceTitle>
              <Code>{call}</Code>
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <ToolCode>{part.errorText}</ToolCode>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    );
  }

  if (part.state !== "output-available") {
    return (
      <TraceLine status={running ? "running" : "error"}>
        <TraceIcon>
          {running ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <CircleAlertIcon />
          )}
        </TraceIcon>
        <TraceTitle>
          <Code>{call}</Code>
        </TraceTitle>
      </TraceLine>
    );
  }

  const subagent = SubagentOutput.safeParse(part.output);

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon>
            <CircleCheckIcon />
          </TraceIcon>
          <TraceTitle>
            <Code>{call}</Code>
          </TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent keepMounted>
        <div className="grid gap-2">
          <ToolCode>{JSON.stringify(part.input, null, 2)}</ToolCode>
          {subagent.success ? (
            <ExecutionTranscript
              parts={subagent.data.parts}
              running={running}
            />
          ) : (
            <ToolCode>{outputText(part)}</ToolCode>
          )}
        </div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

function ToolCode({ children }: { children: string }) {
  return (
    <CodeBlock size="sm">
      <CodeBlockContent wrap className="max-h-64">
        {children}
      </CodeBlockContent>
    </CodeBlock>
  );
}

function outputText({
  output,
}: Extract<DynamicToolUIPart, { state: "output-available" }>) {
  const text = z.string().safeParse(output);

  if (text.success) {
    return text.data;
  }

  const blocks = TextBlocks.safeParse(output);

  return blocks.success
    ? blocks.data.map((block) => block.text).join("\n")
    : JSON.stringify(output, null, 2);
}
