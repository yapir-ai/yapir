import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import type { ProjectInfoParamsDto } from "@server/lib/projects/project-info.dto";
import { requireProjectAccess } from "@server/lib/projects/project.validator";

import type { ProjectRepositoryListRequestDto } from "./project-repository-list.dto";
import { toResponseDto } from "./project-repository.dto";

export function projectRepositoryListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId }: ProjectInfoParamsDto,
    { offset, limit, order }: ProjectRepositoryListRequestDto
  ) {
    await requireProjectAccess(db, currentUser, "read", projectId);

    const links = await db.query.projectRepositoryTable.findMany({
      where: { projectId },
      orderBy: { repositoryId: order },
      offset,
      limit,
    });

    return { items: links.map(toResponseDto) };
  }

  return { execute };
}
