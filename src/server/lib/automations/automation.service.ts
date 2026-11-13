import type { ProjectAccess } from "@server/lib/auth/access";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

export function automationService({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  // Without the access, the automation is reported missing, as when it does not exist.
  async function requireAccess(access: ProjectAccess, automationId: string) {
    const automation = await db.query.automationTable.findFirst({
      where: { id: automationId },
    });

    if (
      !automation ||
      !(await currentUser.hasProjectAccess(access, automation.projectId))
    ) {
      throw notFound("AUTOMATION_NOT_FOUND");
    }

    return automation;
  }

  return { requireAccess };
}

export type AutomationService = ReturnType<typeof automationService>;
