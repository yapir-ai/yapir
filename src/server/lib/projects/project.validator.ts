import type { ProjectAccess } from "@server/lib/auth/access";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

export async function requireProject(db: Db, projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: { id: projectId },
    with: {
      repositories: { columns: { id: true, provider: true, host: true } },
    },
  });

  if (!project) {
    throw notFound("PROJECT_NOT_FOUND");
  }

  return project;
}

// Without the access, the project is reported missing, as when it does not exist.
export async function requireProjectAccess(
  db: Db,
  currentUser: CurrentUser,
  access: ProjectAccess,
  projectId: string
) {
  if (!(await currentUser.hasProjectAccess(access, projectId))) {
    throw notFound("PROJECT_NOT_FOUND");
  }

  return await requireProject(db, projectId);
}
