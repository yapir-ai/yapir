import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { modelProviderTable } from "@server/lib/db/schema";
import { conflict } from "@server/lib/errors/error.factory";
import { and, eq, isNull } from "drizzle-orm";

import type { ModelProviderInfoParamsDto } from "./model-provider-info.dto";

export function modelProviderDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ modelProviderId }: ModelProviderInfoParamsDto) {
    await currentUser.requireAdmin();

    const [agent, defaults] = await Promise.all([
      db.query.agentTable.findFirst({
        columns: { id: true },
        where: { modelProviderId, deletedAt: { isNull: true } },
      }),
      db.query.defaultsTable.findFirst({
        columns: { id: true },
        where: { modelProviderId },
      }),
    ]);

    if (agent || defaults) {
      throw conflict("MODEL_PROVIDER_IN_USE");
    }

    await db
      .update(modelProviderTable)
      .set({ deletedAt: clock.now })
      .where(
        and(
          eq(modelProviderTable.id, modelProviderId),
          isNull(modelProviderTable.deletedAt)
        )
      );
  }

  return { execute };
}
