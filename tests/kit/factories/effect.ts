import { effectTable } from "@server/lib/db/schema";

type EffectSelect = typeof effectTable.$inferSelect;

export function effectRow({
  automationId,
  taskId,
  agentId,
  executionId,
  ...override
}: Pick<EffectSelect, "automationId" | "taskId" | "agentId" | "executionId"> &
  Partial<EffectSelect>): EffectSelect {
  return {
    integration: "github",
    host: "github.com",
    kind: "issue",
    externalId: "8001#3",
    automationId,
    taskId,
    agentId,
    agentName: "Reviewer",
    executionId,
    createdAt: new Date("2026-08-31T09:08:00Z"),
    presentation: { label: "#3" },
    ...override,
  };
}

effectRow.table = effectTable;
