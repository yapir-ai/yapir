import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { WebhookInfoParamsDto } from "./webhook-info.dto";
import { toResponseDto } from "./webhook.dto";

export function webhookInfoOperation({ db }: { db: Db }) {
  async function execute({ webhookId }: WebhookInfoParamsDto) {
    const webhook = await db.query.webhookTable.findFirst({
      columns: { secret: false },
      where: { id: webhookId },
    });

    if (!webhook) {
      throw notFound("WEBHOOK_NOT_FOUND");
    }

    return toResponseDto(webhook);
  }

  return { execute };
}
