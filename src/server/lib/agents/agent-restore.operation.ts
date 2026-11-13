import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { agentTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { requireModelProvider } from "@server/lib/model-providers/model-provider.validator";
import { eq } from "drizzle-orm";

import type { AgentInfoParamsDto } from "./agent-info.dto";
import { toResponseDto } from "./agent.dto";

export function agentRestoreOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ agentId }: AgentInfoParamsDto) {
    await currentUser.requireAdmin();

    const current = await db.query.agentTable.findFirst({
      columns: { modelProviderId: true },
      where: { id: agentId },
    });

    if (!current) {
      throw notFound("AGENT_NOT_FOUND");
    }

    await requireModelProvider(db, current.modelProviderId);

    const [agent] = await db
      .update(agentTable)
      .set({ deletedAt: null })
      .where(eq(agentTable.id, agentId))
      .returning();

    return toResponseDto(agent!);
  }

  return { execute };
}
