import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { mcpServerTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { McpServerInfoParamsDto } from "./mcp-server-info.dto";
import { toResponseDto } from "./mcp-server.dto";

export function mcpServerRestoreOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ mcpServerId }: McpServerInfoParamsDto) {
    await currentUser.requireAdmin();

    const [mcpServer] = await db
      .update(mcpServerTable)
      .set({ deletedAt: null })
      .where(eq(mcpServerTable.id, mcpServerId))
      .returning();

    if (!mcpServer) {
      throw notFound("MCP_SERVER_NOT_FOUND");
    }

    return toResponseDto(mcpServer);
  }

  return { execute };
}
