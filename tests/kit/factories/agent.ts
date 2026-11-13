import { agentTable } from "@server/lib/db/schema";
import type { AgentSelect } from "@server/lib/db/schema";

export function agentRow({
  modelProviderId,
  ...override
}: Pick<AgentSelect, "modelProviderId"> & Partial<AgentSelect>): AgentSelect {
  return {
    id: "01960000-0000-7000-8000-000000000301",
    name: "Reviewer",
    description: null,
    modelProviderId,
    model: "deepseek-v4.1-flash",
    effort: null,
    harness: "opencode",
    prompt: "Review the pull request.",
    triggers: [],
    capabilities: [],
    skillIds: [],
    deletedAt: null,
    ...override,
  };
}

agentRow.table = agentTable;
