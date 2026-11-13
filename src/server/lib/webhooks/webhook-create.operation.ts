import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { webhookTable } from "@server/lib/db/schema";

import type { WebhookCreateRequestDto } from "./webhook-create.dto";
import { toResponseDto } from "./webhook.dto";

export function webhookCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: WebhookCreateRequestDto) {
    await currentUser.requireAdmin();

    const [webhook] = await db
      .insert(webhookTable)
      .values(requestDto)
      .returning();

    return toResponseDto(webhook!);
  }

  return { execute };
}
