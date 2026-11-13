import type { TaskState as TaskStateName } from "@server/lib/tasks/task.dto";
import { Status } from "@web/components/ui/status";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleStop,
} from "lucide-react";
import type { ComponentProps } from "react";

export const taskStates = {
  idle: { label: "Idle", icon: CircleCheck, tone: "success" },
  queued: { label: "Queued", icon: CircleDashed, tone: "muted" },
  running: { label: "Running", icon: CircleDot, tone: "info" },
  blocked: { label: "Blocked", icon: CircleAlert, tone: "destructive" },
  stopped: { label: "Stopped", icon: CircleStop, tone: "muted" },
} as const;

export function TaskState({
  state,
  children = taskStates[state].label,
  ...props
}: Omit<ComponentProps<typeof Status>, "tone" | "live"> & {
  state: TaskStateName;
}) {
  const { icon: Icon, tone } = taskStates[state];

  return (
    <Status tone={tone} live={state === "running"} {...props}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </Status>
  );
}
