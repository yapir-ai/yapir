import { automationTable } from "@server/lib/db/schema";
import type { AutomationSelect } from "@server/lib/db/schema";

export function automationRow({
  agentId,
  projectId,
  ...override
}: Pick<AutomationSelect, "agentId" | "projectId"> &
  Partial<AutomationSelect>): AutomationSelect {
  return {
    id: "01960000-0000-7000-8000-000000000401",
    name: "Review pull requests",
    enabled: true,
    agentId,
    projectId,
    ciRepositoryId: null,
    instructions: "",
    triggers: [],
    capabilities: [],
    dispatcher: "github-actions",
    deletedAt: null,
    ...override,
  };
}

automationRow.table = automationTable;
