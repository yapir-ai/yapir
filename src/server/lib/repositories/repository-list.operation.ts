import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { RepositoryListRequestDto } from "./repository-list.dto";
import { toResponseDto } from "./repository.dto";

export function repositoryListOperation({
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
    order,
  }: RepositoryListRequestDto) {
    const repositories = await db.query.repositoryTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
        projects: await currentUser.readableProjects(),
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: repositories.map(toResponseDto) };
  }

  return { execute };
}
