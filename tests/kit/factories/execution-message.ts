import { executionMessageTable } from "@server/lib/db/schema";
import type { ExecutionMessageSelect } from "@server/lib/db/schema";

export function executionMessageRow({
  executionId,
  ...override
}: Pick<ExecutionMessageSelect, "executionId"> &
  Partial<ExecutionMessageSelect>): ExecutionMessageSelect {
  return {
    id: "01960000-0000-7000-8000-000000001001",
    executionId,
    message: {
      id: "01960000-0000-7000-8000-000000001001",
      role: "assistant",
      parts: [{ type: "text", text: "The review is done." }],
    },
    createdAt: new Date("2026-08-31T09:06:00Z"),
    ...override,
  };
}

executionMessageRow.table = executionMessageTable;
