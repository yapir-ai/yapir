import { ReasoningTraceLine } from "@web/components/reasoning-trace-line";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@web/components/ui/trace";
import { isStaticToolUIPart } from "ai";
import type { ReasoningUIPart, TextUIPart, ToolUIPart, UIMessage } from "ai";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react";

const phaseLabels = {
  configuration: {
    pending: "Reading configuration…",
    completed: "Configuration checked",
    failed: "Failed to read configuration",
  },
  validation: {
    pending: "Checking trigger conditions…",
    completed: "Trigger conditions checked",
    failed: "Invalid trigger conditions",
  },
};

interface ToolStatusStep {
  type: "tool-status";
  phase: keyof typeof phaseLabels;
  tools: [ToolUIPart, ...ToolUIPart[]];
}

type AssistantStep = ReasoningUIPart | ToolStatusStep;

type AssistantMessagePart =
  | TextUIPart
  | { type: "trace"; steps: AssistantStep[] };

// Consecutive steps share a trace, and consecutive reads or validations share a line; answer text keeps their order.
export function groupAssistantMessageParts(parts: UIMessage["parts"]) {
  const grouped: AssistantMessagePart[] = [];

  for (const part of parts) {
    if (part.type === "text") {
      grouped.push(part);
    } else if (part.type === "reasoning" || isStaticToolUIPart(part)) {
      const previous = grouped.at(-1);

      if (previous?.type === "trace") {
        addStep(previous.steps, part);
      } else {
        const trace = { type: "trace" as const, steps: [] };
        addStep(trace.steps, part);
        grouped.push(trace);
      }
    }
  }

  return grouped;
}

function addStep(steps: AssistantStep[], part: ReasoningUIPart | ToolUIPart) {
  if (part.type === "reasoning") {
    steps.push(part);

    return;
  }

  const phase =
    part.type === "tool-validateCel" ? "validation" : "configuration";

  const previous = steps.at(-1);

  if (previous?.type === "tool-status" && previous.phase === phase) {
    previous.tools.push(part);
  } else {
    steps.push({ type: "tool-status", phase, tools: [part] });
  }
}

export function AssistantTrace({
  steps,
  streaming,
}: {
  steps: AssistantStep[];
  streaming: boolean;
}) {
  return (
    <Trace>
      {steps.map((step, index) =>
        step.type === "reasoning" ? (
          <ReasoningTraceLine
            key={index}
            text={step.text}
            running={streaming && step.state === "streaming"}
          />
        ) : (
          <ToolStatusLine key={index} phase={step.phase} tools={step.tools} />
        )
      )}
    </Trace>
  );
}

// Before the answer's first step arrives.
export function AssistantThinking() {
  return (
    <Trace>
      <ReasoningTraceLine text="" running />
    </Trace>
  );
}

function ToolStatusLine({
  phase,
  tools,
}: Pick<ToolStatusStep, "phase" | "tools">) {
  const labels = phaseLabels[phase];
  const error = tools.find((tool) => tool.state === "output-error");

  if (error) {
    return (
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="error">
            <TraceIcon>
              <CircleAlertIcon />
            </TraceIcon>
            <TraceTitle>{labels.failed}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>{error.errorText}</TraceCollapsibleContent>
      </TraceCollapsible>
    );
  }

  const completed = tools.every((tool) => tool.state === "output-available");

  return (
    <TraceLine status={completed ? undefined : "running"}>
      <TraceIcon>
        {completed ? (
          <CircleCheckIcon />
        ) : (
          <LoaderCircleIcon className="animate-spin" />
        )}
      </TraceIcon>
      <TraceTitle>{completed ? labels.completed : labels.pending}</TraceTitle>
    </TraceLine>
  );
}
