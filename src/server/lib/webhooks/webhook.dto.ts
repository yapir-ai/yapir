import type { WebhookSelect } from "@server/lib/db/schema";
import { z } from "zod";

export const WebhookAuthSchema = z
  .enum(["header", "hmac"])
  .describe(
    "How deliveries authenticate: header carries the secret itself; hmac carries the prefix and the hex HMAC-SHA256 of the raw body, keyed with the secret"
  );

export const WebhookName = z.string().trim().min(1);

// An HTTP header name: Headers refuse to read any other.
const HeaderName = z
  .string()
  .trim()
  .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u);

export const WebhookHeaderName = HeaderName.describe(
  "The header carrying the secret or the signature, such as X-Hub-Signature-256"
);

export const WebhookSecret = z
  .string()
  .trim()
  .min(1)
  .describe("The secret shared with the sending system");

export const WebhookPrefix = z
  .string()
  .trim()
  .min(1)
  .describe("With hmac: the signature's prefix, such as sha256=");

export const WebhookDeliveryIdHeader = HeaderName.describe(
  "A header identifying each delivery across retries, such as X-GitHub-Delivery: a retried delivery is ignored"
);

export const webhookEventType = (webhookId: string) => `webhook.${webhookId}`;

// The secret is write-only.
export const toResponseDto = (webhook: Omit<WebhookSelect, "secret">) => ({
  id: webhook.id,
  deletedAt: webhook.deletedAt,
  name: webhook.name,
  auth: webhook.auth,
  headerName: webhook.headerName,
  prefix: webhook.prefix,
  deliveryIdHeader: webhook.deliveryIdHeader,
});
