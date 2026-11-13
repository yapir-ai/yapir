import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { McpServerListRequestDto } from "./mcp-server-list.dto";
import { toResponseDto } from "./mcp-server.dto";

export function mcpServerListOperation({ db }: { db: Db }) {
  async function execute({
    offset,
    limit,
    id,
    order,
  }: McpServerListRequestDto) {
    const mcpServers = await db.query.mcpServerTable.findMany({
      columns: { headerValue: false },
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: mcpServers.map(toResponseDto) };
  }

  return { execute };
}
