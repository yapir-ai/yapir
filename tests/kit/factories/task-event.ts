import { taskEventTable } from "@server/lib/db/schema";

type TaskEventSelect = typeof taskEventTable.$inferSelect;

export function taskEventRow({
  taskId,
  ...override
}: Pick<TaskEventSelect, "taskId"> &
  Partial<TaskEventSelect>): TaskEventSelect {
  return {
    taskId,
    eventId: "github:github.com:delivery-0",
    notification: {
      type: "github.pull_request.opened",
      data: {},
      author: null,
    },
    receivedAt: new Date("2026-08-31T09:00:00Z"),
    state: "pending",
    executionId: null,
    ...override,
  };
}

taskEventRow.table = taskEventTable;
