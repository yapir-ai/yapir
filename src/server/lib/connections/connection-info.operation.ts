import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { ConnectionInfoParamsDto } from "./connection-info.dto";
import { toResponseDto } from "./connection.dto";

export function connectionInfoOperation({ db }: { db: Db }) {
  async function execute({ type }: ConnectionInfoParamsDto) {
    const connection = await db.query.connectionTable.findFirst({
      columns: { secrets: false },
      where: { type },
    });

    if (!connection) {
      throw notFound("CONNECTION_NOT_FOUND");
    }

    return toResponseDto(connection);
  }

  return { execute };
}
