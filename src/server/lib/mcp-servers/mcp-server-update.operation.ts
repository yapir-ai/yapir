import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { mcpServerTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { McpServerInfoParamsDto } from "./mcp-server-info.dto";
import type { McpServerUpdateRequestDto } from "./mcp-server-update.dto";
import type { McpServerClient } from "./mcp-server.client";
import { mcpServerSlug, toResponseDto } from "./mcp-server.dto";

export function mcpServerUpdateOperation({
  db,
  currentUser,
  mcpServerClient,
}: {
  db: Db;
  currentUser: CurrentUser;
  mcpServerClient: McpServerClient;
}) {
  async function execute(
    { mcpServerId }: McpServerInfoParamsDto,
    requestDto: McpServerUpdateRequestDto
  ) {
    await currentUser.requireAdmin();
    mcpServerClient.requireFixedIp(requestDto.fixedIp);

    const current = await db.query.mcpServerTable.findFirst({
      where: { id: mcpServerId },
    });

    if (!current) {
      throw notFound("MCP_SERVER_NOT_FOUND");
    }

    if (current.deletedAt) {
      throw conflict("MCP_SERVER_DELETED");
    }

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(current);
    }

    const slug = requestDto.name && mcpServerSlug(requestDto.name);

    const homonym =
      slug &&
      (await db.query.mcpServerTable.findFirst({
        columns: { id: true },
        where: { slug, id: { ne: mcpServerId } },
      }));

    if (homonym) {
      throw conflict("MCP_SERVER_SLUG_TAKEN");
    }

    const [mcpServer] = await db
      .update(mcpServerTable)
      .set({
        ...requestDto,
        slug,
        tools: await mcpServerClient.listTools({ ...current, ...requestDto }),
      })
      .where(eq(mcpServerTable.id, mcpServerId))
      .returning();

    return toResponseDto(mcpServer!);
  }

  return { execute };
}
