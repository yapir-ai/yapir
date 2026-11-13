import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import type { ProjectInfoParamsDto } from "@server/lib/projects/project-info.dto";
import { requireProjectAccess } from "@server/lib/projects/project.validator";

import type { ProjectMemberListRequestDto } from "./project-member-list.dto";
import { toResponseDto } from "./project-member.dto";

export function projectMemberListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId }: ProjectInfoParamsDto,
    { offset, limit, order }: ProjectMemberListRequestDto
  ) {
    await requireProjectAccess(db, currentUser, "read", projectId);

    const members = await db.query.projectMemberTable.findMany({
      where: { projectId },
      orderBy: { userId: order },
      offset,
      limit,
    });

    return { items: members.map(toResponseDto) };
  }

  return { execute };
}
