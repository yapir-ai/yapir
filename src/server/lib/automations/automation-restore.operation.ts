import type { Db } from "@server/lib/db";
import { automationTable } from "@server/lib/db/schema";
import { conflict } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { AutomationInfoRequestDto } from "./automation-info.dto";
import { toResponseDto } from "./automation.dto";
import type { AutomationService } from "./automation.service";

export function automationRestoreOperation({
  db,
  automationService,
}: {
  db: Db;
  automationService: AutomationService;
}) {
  async function execute({ automationId }: AutomationInfoRequestDto) {
    const current = await automationService.requireAccess(
      "write",
      automationId
    );

    const [agent, project] = await Promise.all([
      db.query.agentTable.findFirst({
        columns: { deletedAt: true },
        where: { id: current.agentId },
      }),
      db.query.projectTable.findFirst({
        columns: { deletedAt: true },
        where: { id: current.projectId },
      }),
    ]);

    if (agent?.deletedAt) {
      throw conflict("AGENT_DELETED");
    }

    if (project?.deletedAt) {
      throw conflict("PROJECT_DELETED");
    }

    const [automation] = await db
      .update(automationTable)
      .set({ deletedAt: null })
      .where(eq(automationTable.id, automationId))
      .returning();

    return toResponseDto(automation!);
  }

  return { execute };
}
