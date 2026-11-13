import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { connectionTable } from "@server/lib/db/schema";
import { eq } from "drizzle-orm";

import type { ConnectionInfoParamsDto } from "./connection-info.dto";

export function connectionDeleteOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ type }: ConnectionInfoParamsDto) {
    await currentUser.requireAdmin();
    await db.delete(connectionTable).where(eq(connectionTable.type, type));
  }

  return { execute };
}
