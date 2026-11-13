import { z } from "zod";

import {
  WebhookAuthSchema,
  WebhookDeliveryIdHeader,
  WebhookHeaderName,
  WebhookName,
  WebhookPrefix,
  WebhookSecret,
} from "./webhook.dto";

export const WebhookUpdateRequest = z
  .strictObject({
    name: WebhookName,
    auth: WebhookAuthSchema,
    headerName: WebhookHeaderName,
    secret: WebhookSecret,
    prefix: WebhookPrefix.nullable(),
    deliveryIdHeader: WebhookDeliveryIdHeader.nullable(),
  })
  .partial();

export type WebhookUpdateRequestDto = z.infer<typeof WebhookUpdateRequest>;
