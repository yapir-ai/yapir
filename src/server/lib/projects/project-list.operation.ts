import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { ProjectListRequestDto } from "./project-list.dto";
import { toResponseDto } from "./project.dto";

export function projectListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    offset,
    limit,
    id,
    repositoryId,
    order,
  }: ProjectListRequestDto) {
    const projects = await db.query.projectTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
        repositories: repositoryId ? { id: { in: repositoryId } } : EmptyFilter,
        AND: [await currentUser.readableProjects()],
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: projects.map(toResponseDto) };
  }

  return { execute };
}

export type ProjectListOperation = ReturnType<typeof projectListOperation>;
