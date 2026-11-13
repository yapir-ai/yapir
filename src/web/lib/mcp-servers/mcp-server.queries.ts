import { deletedFilter, infoQuery, query } from "@web/lib/db/query";

import { mcpServersCollection } from "./mcp-server.collection";

export function mcpServerListQuery(showDeleted = false) {
  const visible = deletedFilter(showDeleted);

  return {
    queryKey: ["mcp-servers", showDeleted],
    ...query((q) =>
      q
        .from({ mcpServer: mcpServersCollection })
        .fn.where(({ mcpServer }) => visible(mcpServer.deletedAt))
        .orderBy(({ mcpServer }) => mcpServer.name)
    ),
  };
}

export function mcpServerInfoQuery(mcpServerId: string) {
  return infoQuery(mcpServersCollection, mcpServerId);
}
