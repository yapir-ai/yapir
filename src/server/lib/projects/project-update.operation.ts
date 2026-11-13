import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { badRequest, conflict } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { ProjectInfoParamsDto } from "./project-info.dto";
import type { ProjectUpdateRequestDto } from "./project-update.dto";
import { toResponseDto } from "./project.dto";
import { requireProjectAccess } from "./project.validator";

export function projectUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId }: ProjectInfoParamsDto,
    requestDto: ProjectUpdateRequestDto
  ) {
    const current = await requireProjectAccess(
      db,
      currentUser,
      "write",
      projectId
    );

    if (current.deletedAt) {
      throw conflict("PROJECT_DELETED");
    }

    if (
      requestDto.ciRepositoryId &&
      !current.repositories.some(({ id }) => id === requestDto.ciRepositoryId)
    ) {
      throw badRequest("PROJECT_CI_REPOSITORY_INVALID");
    }

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(current);
    }

    const [project] = await db
      .update(projectTable)
      .set(requestDto)
      .where(eq(projectTable.id, projectId))
      .returning();

    return toResponseDto(project!);
  }

  return { execute };
}
