import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { webhookTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { WebhookInfoParamsDto } from "./webhook-info.dto";
import { toResponseDto } from "./webhook.dto";

export function webhookRestoreOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ webhookId }: WebhookInfoParamsDto) {
    await currentUser.requireAdmin();

    const [webhook] = await db
      .update(webhookTable)
      .set({ deletedAt: null })
      .where(eq(webhookTable.id, webhookId))
      .returning();

    if (!webhook) {
      throw notFound("WEBHOOK_NOT_FOUND");
    }

    return toResponseDto(webhook);
  }

  return { execute };
}
