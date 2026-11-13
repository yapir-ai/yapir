import type { WebhookAuthSchema } from "@server/lib/webhooks/webhook.dto";
import type { z } from "zod";

export const webhookAuthLabels: Record<
  z.infer<typeof WebhookAuthSchema>,
  string
> = {
  header: "Shared secret",
  hmac: "HMAC-SHA256 signature",
};

export const webhookAuthOptions = Object.entries(webhookAuthLabels).map(
  ([value, label]) => ({ label, value })
);
