import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { McpServerInfoParamsDto } from "./mcp-server-info.dto";
import { toResponseDto } from "./mcp-server.dto";

export function mcpServerInfoOperation({ db }: { db: Db }) {
  async function execute({ mcpServerId }: McpServerInfoParamsDto) {
    const mcpServer = await db.query.mcpServerTable.findFirst({
      columns: { headerValue: false },
      where: { id: mcpServerId },
    });

    if (!mcpServer) {
      throw notFound("MCP_SERVER_NOT_FOUND");
    }

    return toResponseDto(mcpServer);
  }

  return { execute };
}
