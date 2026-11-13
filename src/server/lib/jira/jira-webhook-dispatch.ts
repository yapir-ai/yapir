import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import { unauthorized } from "@server/lib/errors/error.factory";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";
import { parseWebhookBody } from "@server/lib/webhooks/webhook-body";
import {
  hmacSha256Hex,
  isExpectedSecret,
} from "@server/lib/webhooks/webhook-signature";
import { z } from "zod";

const payloadSchema = z.object({ webhookEvent: z.string() });

// Jira signs the raw body with the webhook's secret: "sha256=<hex HMAC>".
const isSigned = (secret: string, body: string, signature: string) =>
  isExpectedSecret(signature, `sha256=${hmacSha256Hex(secret, body)}`);

export function jiraWebhookDispatch(
  connection: ConnectionOf<"jira">,
  { eventProcessOperation }: { eventProcessOperation: EventProcessOperation }
) {
  async function execute({
    id,
    signature,
    body,
  }: {
    id: string;
    signature: string;
    body: string;
  }) {
    if (!isSigned(connection.webhookSecret, body, signature)) {
      throw unauthorized("WEBHOOK_SIGNATURE_INVALID");
    }

    const payload = parseWebhookBody(z.json(), body);
    const type = `jira.${payloadSchema.parse(payload).webhookEvent.replace("jira:", "")}`;
    await eventProcessOperation.execute({ id, type, payload });
  }

  return { execute };
}
