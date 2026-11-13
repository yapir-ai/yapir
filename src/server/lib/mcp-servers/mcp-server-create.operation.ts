import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { mcpServerTable } from "@server/lib/db/schema";
import { conflict } from "@server/lib/errors/error.factory";

import type { McpServerCreateRequestDto } from "./mcp-server-create.dto";
import type { McpServerClient } from "./mcp-server.client";
import { mcpServerSlug, toResponseDto } from "./mcp-server.dto";

export function mcpServerCreateOperation({
  db,
  currentUser,
  mcpServerClient,
}: {
  db: Db;
  currentUser: CurrentUser;
  mcpServerClient: McpServerClient;
}) {
  async function execute(requestDto: McpServerCreateRequestDto) {
    await currentUser.requireAdmin();
    mcpServerClient.requireFixedIp(requestDto.fixedIp);

    const slug = mcpServerSlug(requestDto.name);

    const homonym = await db.query.mcpServerTable.findFirst({
      columns: { id: true },
      where: { slug },
    });

    if (homonym) {
      throw conflict("MCP_SERVER_SLUG_TAKEN");
    }

    const [mcpServer] = await db
      .insert(mcpServerTable)
      .values({
        ...requestDto,
        slug,
        tools: await mcpServerClient.listTools(requestDto),
      })
      .returning();

    return toResponseDto(mcpServer!);
  }

  return { execute };
}
