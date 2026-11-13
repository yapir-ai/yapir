import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectMemberTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { and, eq } from "drizzle-orm";

import type { ProjectMemberUpdateRequestDto } from "./project-member-update.dto";
import type { ProjectMemberParamsDto } from "./project-member.dto";
import { toResponseDto } from "./project-member.dto";

export function projectMemberUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { projectId, userId }: ProjectMemberParamsDto,
    requestDto: ProjectMemberUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const [member] = await db
      .update(projectMemberTable)
      .set(requestDto)
      .where(
        and(
          eq(projectMemberTable.projectId, projectId),
          eq(projectMemberTable.userId, userId)
        )
      )
      .returning();

    if (!member) {
      throw notFound("PROJECT_MEMBER_NOT_FOUND");
    }

    return toResponseDto(member);
  }

  return { execute };
}
