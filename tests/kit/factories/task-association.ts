import { taskAssociationTable } from "@server/lib/db/schema";

type TaskAssociationSelect = typeof taskAssociationTable.$inferSelect;

export function taskAssociationRow({
  automationId,
  taskId,
  ...override
}: Pick<TaskAssociationSelect, "automationId" | "taskId"> &
  Partial<TaskAssociationSelect>): TaskAssociationSelect {
  return {
    automationId,
    taskId,
    integration: "github",
    host: "github.com",
    kind: "issue",
    externalId: "8001#3",
    presentation: { label: "#3" },
    createdAt: new Date("2026-08-31T09:00:00Z"),
    ...override,
  };
}

taskAssociationRow.table = taskAssociationTable;
