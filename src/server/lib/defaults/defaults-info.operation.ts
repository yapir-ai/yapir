import type { Db } from "@server/lib/db";

import { toResponseDto } from "./defaults.dto";

export function defaultsInfoOperation({ db }: { db: Db }) {
  async function execute() {
    return toResponseDto(await db.query.defaultsTable.findFirst());
  }

  return { execute };
}
