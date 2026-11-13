import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { webhookTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import { and, eq, isNull } from "drizzle-orm";

import type { WebhookInfoParamsDto } from "./webhook-info.dto";
import type { WebhookUpdateRequestDto } from "./webhook-update.dto";
import { toResponseDto } from "./webhook.dto";

export function webhookUpdateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(
    { webhookId }: WebhookInfoParamsDto,
    requestDto: WebhookUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const [webhook] = await db
      .update(webhookTable)
      .set(requestDto)
      .where(
        and(eq(webhookTable.id, webhookId), isNull(webhookTable.deletedAt))
      )
      .returning();

    if (!webhook) {
      throw notFound("WEBHOOK_NOT_FOUND");
    }

    return toResponseDto(webhook);
  }

  return { execute };
}
