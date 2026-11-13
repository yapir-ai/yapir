import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { agentTable } from "@server/lib/db/schema";
import { conflict } from "@server/lib/errors/error.factory";
import { and, eq, isNull } from "drizzle-orm";

import type { AgentInfoParamsDto } from "./agent-info.dto";

export function agentDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ agentId }: AgentInfoParamsDto) {
    await currentUser.requireAdmin();

    const automation = await db.query.automationTable.findFirst({
      columns: { id: true },
      where: { agentId, deletedAt: { isNull: true } },
    });

    if (automation) {
      throw conflict("AGENT_IN_USE");
    }

    await db
      .update(agentTable)
      .set({ deletedAt: clock.now })
      .where(and(eq(agentTable.id, agentId), isNull(agentTable.deletedAt)));
  }

  return { execute };
}
