import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";

import type { ProjectInfoParamsDto } from "./project-info.dto";
import { toResponseDto } from "./project.dto";
import { requireProjectAccess } from "./project.validator";

export function projectInfoOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ projectId }: ProjectInfoParamsDto) {
    return toResponseDto(
      await requireProjectAccess(db, currentUser, "read", projectId)
    );
  }

  return { execute };
}
