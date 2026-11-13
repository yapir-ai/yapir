import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectRepositoryTable, projectTable } from "@server/lib/db/schema";
import {
  badRequest,
  conflict,
  notFound,
} from "@server/lib/errors/error.factory";
import type { ProjectInfoParamsDto } from "@server/lib/projects/project-info.dto";
import { requireProject } from "@server/lib/projects/project.validator";
import { eq } from "drizzle-orm";

import type { ProjectRepositoryCreateRequestDto } from "./project-repository-create.dto";
import { toResponseDto } from "./project-repository.dto";

export function projectRepositoryCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId }: ProjectInfoParamsDto,
    { repositoryId }: ProjectRepositoryCreateRequestDto
  ) {
    await currentUser.requireAdmin();
    const project = await requireProject(db, projectId);

    const repository = await db.query.repositoryTable.findFirst({
      columns: { provider: true, host: true },
      where: { id: repositoryId },
    });

    if (!repository) {
      throw notFound("REPOSITORY_NOT_FOUND");
    }

    if (
      project.repositories.some(
        ({ provider, host }) =>
          provider !== repository.provider || host !== repository.host
      )
    ) {
      throw badRequest("GIT_HOST_MISMATCH");
    }

    const [link] = await db
      .insert(projectRepositoryTable)
      .values({ projectId, repositoryId })
      .onConflictDoNothing()
      .returning();

    if (!link) {
      throw conflict("PROJECT_REPOSITORY_EXISTS");
    }

    if (!project.ciRepositoryId) {
      await db
        .update(projectTable)
        .set({ ciRepositoryId: repositoryId })
        .where(eq(projectTable.id, projectId));
    }

    return toResponseDto(link);
  }

  return { execute };
}
