import type { Db } from "@server/lib/db";
import type { WebhookSelect } from "@server/lib/db/schema";
import { notFound, unauthorized } from "@server/lib/errors/error.factory";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";

import { parseWebhookBody } from "./webhook-body";
import type { WebhookInfoParamsDto } from "./webhook-info.dto";
import { hmacSha256Hex, isExpectedSecret } from "./webhook-signature";
import { webhookEventType } from "./webhook.dto";
import { webhookDeliverySchema } from "./webhook.event";

function isAuthentic(webhook: WebhookSelect, body: string, received: string) {
  return isExpectedSecret(
    received,
    webhook.auth === "header"
      ? webhook.secret
      : `${webhook.prefix ?? ""}${hmacSha256Hex(webhook.secret, body)}`
  );
}

export function webhookDeliveryOperation({
  db,
  eventProcessOperation,
}: {
  db: Db;
  eventProcessOperation: EventProcessOperation;
}) {
  async function execute(
    { webhookId }: WebhookInfoParamsDto,
    request: Request
  ) {
    const webhook = await db.query.webhookTable.findFirst({
      where: { id: webhookId, deletedAt: { isNull: true } },
    });

    if (!webhook) {
      throw notFound("WEBHOOK_NOT_FOUND");
    }

    const body = await request.text();
    const authenticationHeader = webhook.headerName.toLowerCase();

    if (
      !isAuthentic(
        webhook,
        body,
        request.headers.get(authenticationHeader) ?? ""
      )
    ) {
      throw unauthorized("WEBHOOK_SIGNATURE_INVALID");
    }

    const headers = Object.fromEntries(
      [...request.headers].filter(([name]) => name !== authenticationHeader)
    );

    await eventProcessOperation.execute({
      id:
        (webhook.deliveryIdHeader
          ? request.headers.get(webhook.deliveryIdHeader)
          : null) ?? crypto.randomUUID(),
      type: webhookEventType(webhook.id),
      payload: {
        body: parseWebhookBody(webhookDeliverySchema.shape.body, body),
        headers,
      },
    });
  }

  return { execute };
}
