import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { automationTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { and, eq, isNull } from "drizzle-orm";

import type { AutomationInfoRequestDto } from "./automation-info.dto";

export function automationDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ automationId }: AutomationInfoRequestDto) {
    const automation = await db.query.automationTable.findFirst({
      columns: { projectId: true },
      where: { id: automationId },
    });

    if (!automation) {
      return;
    }

    if (!(await currentUser.hasProjectAccess("write", automation.projectId))) {
      throw notFound("AUTOMATION_NOT_FOUND");
    }

    await db
      .update(automationTable)
      .set({ deletedAt: clock.now, enabled: false })
      .where(
        and(
          eq(automationTable.id, automationId),
          isNull(automationTable.deletedAt)
        )
      );
  }

  return { execute };
}
