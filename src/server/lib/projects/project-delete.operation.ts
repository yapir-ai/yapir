import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { automationTable, projectTable } from "@server/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { ProjectInfoParamsDto } from "./project-info.dto";

export function projectDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ projectId }: ProjectInfoParamsDto) {
    await currentUser.requireAdmin();

    await db.transaction(async (tx) => {
      await tx
        .update(projectTable)
        .set({ deletedAt: clock.now })
        .where(
          and(eq(projectTable.id, projectId), isNull(projectTable.deletedAt))
        );

      await tx
        .update(automationTable)
        .set({ deletedAt: clock.now, enabled: false })
        .where(
          and(
            eq(automationTable.projectId, projectId),
            isNull(automationTable.deletedAt)
          )
        );
    });
  }

  return { execute };
}
