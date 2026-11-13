import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import {
  automationTable,
  projectRepositoryTable,
  projectTable,
} from "@server/lib/db/schema";
import { conflict } from "@server/lib/errors/error.factory";
import { and, eq } from "drizzle-orm";

import type { ProjectRepositoryParamsDto } from "./project-repository.dto";

export function projectRepositoryDeleteOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    projectId,
    repositoryId,
  }: ProjectRepositoryParamsDto) {
    await currentUser.requireAdmin();

    const ciAutomation = await db.query.automationTable.findFirst({
      columns: { id: true },
      where: {
        projectId,
        ciRepositoryId: repositoryId,
        dispatcher: { ne: "local" },
        deletedAt: { isNull: true },
      },
    });

    if (ciAutomation) {
      throw conflict("REPOSITORY_IN_USE");
    }

    await db
      .update(automationTable)
      .set({ ciRepositoryId: null })
      .where(
        and(
          eq(automationTable.projectId, projectId),
          eq(automationTable.ciRepositoryId, repositoryId)
        )
      );

    await db
      .delete(projectRepositoryTable)
      .where(
        and(
          eq(projectRepositoryTable.projectId, projectId),
          eq(projectRepositoryTable.repositoryId, repositoryId)
        )
      );

    const remaining = await db.query.projectRepositoryTable.findFirst({
      columns: { repositoryId: true },
      where: { projectId },
    });

    await db
      .update(projectTable)
      .set({ ciRepositoryId: remaining?.repositoryId ?? null })
      .where(
        and(
          eq(projectTable.id, projectId),
          eq(projectTable.ciRepositoryId, repositoryId)
        )
      );
  }

  return { execute };
}
