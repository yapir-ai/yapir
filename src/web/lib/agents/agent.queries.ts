import { infoQuery, listFilter, query } from "@web/lib/db/query";

import { agentsCollection } from "./agent.collection";

export function agentListQuery(search = "", showDeleted = false) {
  const { term, matches } = listFilter(search, showDeleted);

  return {
    queryKey: ["agents", term, showDeleted],
    ...query((q) =>
      q
        .from({ agent: agentsCollection })
        .fn.where(({ agent }) => matches(agent.deletedAt, agent.name))
        .orderBy(({ agent }) => agent.id, "desc")
    ),
  };
}

export function agentInfoQuery(agentId: string) {
  return infoQuery(agentsCollection, agentId);
}
