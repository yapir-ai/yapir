import { workflowTable } from "@server/lib/db/schema";
import type { WorkflowSelect } from "@server/lib/db/schema";

export function workflowRow(override: Partial<WorkflowSelect>): WorkflowSelect {
  return {
    id: "01960000-0000-7000-8000-000000000901",
    type: "counter",
    rootId: "01960000-0000-7000-8000-000000000901",
    parentId: null,
    fields: {},
    journal: [],
    result: null,
    wakeAt: null,
    createdAt: new Date("2026-08-31T09:00:00Z"),
    ...override,
  };
}

workflowRow.table = workflowTable;
