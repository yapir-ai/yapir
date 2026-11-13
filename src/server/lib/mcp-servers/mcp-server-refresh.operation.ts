import type { Db } from "@server/lib/db";
import { mcpServerTable } from "@server/lib/db/schema";
import type { McpServerSelect } from "@server/lib/db/schema";
import { eq } from "drizzle-orm";

import type { McpServerClient } from "./mcp-server.client";

// Refreshes the tool snapshot of every MCP server in use.
export function mcpServerRefreshOperation({
  db,
  mcpServers,
  mcpServerClient,
}: {
  db: Db;
  mcpServers: Promise<McpServerSelect[]>;
  mcpServerClient: McpServerClient;
}) {
  async function execute() {
    await Promise.all(
      (await mcpServers).map(async (mcpServer) => {
        const tools = await mcpServerClient.listTools(mcpServer);

        if (tools) {
          await db
            .update(mcpServerTable)
            .set({ tools })
            .where(eq(mcpServerTable.id, mcpServer.id));
        }
      })
    );
  }

  return { execute };
}

export type McpServerRefreshOperation = ReturnType<
  typeof mcpServerRefreshOperation
>;
