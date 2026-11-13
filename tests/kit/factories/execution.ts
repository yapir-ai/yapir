import { executionTable } from "@server/lib/db/schema";
import type { ExecutionSelect } from "@server/lib/db/schema";

export function executionRow({
  taskId,
  ...override
}: Pick<ExecutionSelect, "taskId"> &
  Partial<ExecutionSelect>): ExecutionSelect {
  return {
    id: "01960000-0000-7000-8000-000000000701",
    taskId,
    outcome: "succeeded",
    dispatcher: "github-actions",
    claimHash: "execution-claim-hash",
    tokenHash: null,
    leaseExpiresAt: new Date("2026-08-31T09:15:00Z"),
    queuedAt: new Date("2026-08-31T09:00:00Z"),
    startedAt: new Date("2026-08-31T09:05:00Z"),
    endedAt: new Date("2026-08-31T09:10:00Z"),
    stoppedById: null,
    error: null,
    agentId: null,
    modelProviderId: null,
    model: null,
    effort: null,
    harness: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost: 0,
    ...override,
  };
}

executionRow.table = executionTable;
