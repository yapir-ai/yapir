import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { projectTable } from "@server/lib/db/schema";

import type { ProjectCreateRequestDto } from "./project-create.dto";
import { toResponseDto } from "./project.dto";

export function projectCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: ProjectCreateRequestDto) {
    await currentUser.requireAdmin();

    const [project] = await db
      .insert(projectTable)
      .values(requestDto)
      .returning();

    return toResponseDto(project!);
  }

  return { execute };
}
