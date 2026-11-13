import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { UserListRequestDto } from "./user-list.dto";
import { toResponseDto } from "./user.dto";

export function userListOperation({ db }: { db: Db }) {
  async function execute({ offset, limit, id, order }: UserListRequestDto) {
    const users = await db.query.userTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: users.map(toResponseDto) };
  }

  return { execute };
}
