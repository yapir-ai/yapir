import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { webhookTable } from "@server/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { WebhookInfoParamsDto } from "./webhook-info.dto";

// Automations keep its triggers: its deliveries are refused while it is deleted.
export function webhookDeleteOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({ webhookId }: WebhookInfoParamsDto) {
    await currentUser.requireAdmin();
    await db
      .update(webhookTable)
      .set({ deletedAt: clock.now })
      .where(
        and(eq(webhookTable.id, webhookId), isNull(webhookTable.deletedAt))
      );
  }

  return { execute };
}
