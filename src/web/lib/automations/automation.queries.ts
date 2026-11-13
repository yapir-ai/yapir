import { eq } from "@tanstack/react-db";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import { query } from "@web/lib/db/query";

import { automationsCollection } from "./automation.collection";

export function automationListQuery(
  projectId: string,
  search = "",
  showDeleted = false
) {
  const term = search.trim().toLowerCase();

  return {
    queryKey: ["automations", projectId, term, showDeleted],
    ...query((q) =>
      q
        .from({ automation: automationsCollection(projectId) })
        .fn.where(
          ({ automation }) =>
            (showDeleted || automation.deletedAt === null) &&
            automation.name.toLowerCase().includes(term)
        )
        .leftJoin({ agent: agentsCollection }, ({ automation, agent }) =>
          eq(automation.agentId, agent.id)
        )
        .orderBy(({ automation }) => automation.id, "desc")
    ),
  };
}

export function automationInfoQuery(projectId: string, automationId: string) {
  return query((q) =>
    q
      .from({ automation: automationsCollection(projectId) })
      .where(({ automation }) => eq(automation.id, automationId))
      .findOne()
  );
}
