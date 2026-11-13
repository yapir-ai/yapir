import { taskTable } from "@server/lib/db/schema";
import type { TaskSelect } from "@server/lib/db/schema";

export function taskRow({
  automationId,
  ...override
}: Pick<TaskSelect, "automationId"> & Partial<TaskSelect>): TaskSelect {
  return {
    id: "01960000-0000-7000-8000-000000000601",
    automationId,
    state: "idle",
    consecutiveFailures: 0,
    activeExecutionId: null,
    createdAt: new Date("2026-08-31T09:00:00Z"),
    stateChangedAt: new Date("2026-08-31T09:10:00Z"),
    ...override,
  };
}

taskRow.table = taskTable;
