import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectMemberTable } from "@server/lib/db/schema";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import type { ProjectInfoParamsDto } from "@server/lib/projects/project-info.dto";
import { requireProject } from "@server/lib/projects/project.validator";

import type { ProjectMemberCreateRequestDto } from "./project-member-create.dto";
import { toResponseDto } from "./project-member.dto";

export function projectMemberCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId }: ProjectInfoParamsDto,
    { userId, role }: ProjectMemberCreateRequestDto
  ) {
    await currentUser.requireAdmin();
    await requireProject(db, projectId);

    const user = await db.query.userTable.findFirst({
      columns: { id: true },
      where: { id: userId },
    });

    if (!user) {
      throw notFound("USER_NOT_FOUND");
    }

    const [member] = await db
      .insert(projectMemberTable)
      .values({ projectId, userId, role })
      .onConflictDoNothing()
      .returning();

    if (!member) {
      throw conflict("PROJECT_MEMBER_EXISTS");
    }

    return toResponseDto(member);
  }

  return { execute };
}
