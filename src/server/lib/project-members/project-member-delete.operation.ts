import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectMemberTable } from "@server/lib/db/schema";
import { and, eq } from "drizzle-orm";

import type { ProjectMemberParamsDto } from "./project-member.dto";

export function projectMemberDeleteOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ projectId, userId }: ProjectMemberParamsDto) {
    await currentUser.requireAdmin();
    await db
      .delete(projectMemberTable)
      .where(
        and(
          eq(projectMemberTable.projectId, projectId),
          eq(projectMemberTable.userId, userId)
        )
      );
  }

  return { execute };
}
