import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { mcpServerTable } from "@server/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { McpServerInfoParamsDto } from "./mcp-server-info.dto";

// Automations keep its capabilities: executions skip them while it is deleted.
export function mcpServerDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ mcpServerId }: McpServerInfoParamsDto) {
    await currentUser.requireAdmin();
    await db
      .update(mcpServerTable)
      .set({ deletedAt: clock.now })
      .where(
        and(
          eq(mcpServerTable.id, mcpServerId),
          isNull(mcpServerTable.deletedAt)
        )
      );
  }

  return { execute };
}
