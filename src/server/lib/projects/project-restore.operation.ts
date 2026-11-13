import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { ProjectInfoParamsDto } from "./project-info.dto";
import { toResponseDto } from "./project.dto";

export function projectRestoreOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ projectId }: ProjectInfoParamsDto) {
    await currentUser.requireAdmin();

    const [project] = await db
      .update(projectTable)
      .set({ deletedAt: null })
      .where(eq(projectTable.id, projectId))
      .returning();

    if (!project) {
      throw notFound("PROJECT_NOT_FOUND");
    }

    return toResponseDto(project);
  }

  return { execute };
}
