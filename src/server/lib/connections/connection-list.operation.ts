import type { Db } from "@server/lib/db";

import type { ConnectionListRequestDto } from "./connection-list.dto";
import { toResponseDto } from "./connection.dto";

export function connectionListOperation({ db }: { db: Db }) {
  async function execute({ offset, limit }: ConnectionListRequestDto) {
    const connections = await db.query.connectionTable.findMany({
      columns: { secrets: false },
      orderBy: { type: "asc" },
      offset,
      limit,
    });

    return { items: connections.map(toResponseDto) };
  }

  return { execute };
}
