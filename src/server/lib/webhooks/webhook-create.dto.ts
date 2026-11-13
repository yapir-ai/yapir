import { z } from "zod";

import {
  WebhookAuthSchema,
  WebhookDeliveryIdHeader,
  WebhookHeaderName,
  WebhookName,
  WebhookPrefix,
  WebhookSecret,
} from "./webhook.dto";

export const WebhookCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: WebhookName,
  auth: WebhookAuthSchema,
  headerName: WebhookHeaderName,
  secret: WebhookSecret,
  prefix: WebhookPrefix.optional(),
  deliveryIdHeader: WebhookDeliveryIdHeader.optional(),
});

export type WebhookCreateRequestDto = z.infer<typeof WebhookCreateRequest>;
