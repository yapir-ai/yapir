import type { AttemptState } from "@server/lib/executions/execution.dto";
import { RelativeTime } from "@web/components/ui/relative-time";
import { Status } from "@web/components/ui/status";
import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleStop,
  CircleX,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const executionStates = {
  queued: { label: "Queued", icon: CircleDashed, tone: "muted" },
  running: { label: "Running", icon: CircleDot, tone: "info" },
  succeeded: { label: "Succeeded", icon: CircleCheck, tone: "success" },
  failed: { label: "Failed", icon: CircleX, tone: "destructive" },
  stopped: { label: "Stopped", icon: CircleStop, tone: "muted" },
} as const;

export function ExecutionState({
  state,
  children = executionStates[state].label,
  ...props
}: Omit<ComponentProps<typeof Status>, "tone" | "live"> & {
  state: AttemptState;
}) {
  const { icon: Icon, tone } = executionStates[state];

  return (
    <Status tone={tone} live={state === "running"} {...props}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </Status>
  );
}

export function ExecutionStamp({
  state,
  date,
  children,
}: {
  state: AttemptState;
  date: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
      <ExecutionState state={state} />
      {children}
      <RelativeTime date={date} />
    </div>
  );
}
