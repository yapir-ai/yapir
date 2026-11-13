import { z } from "zod";

export const WebhookInfoParams = z.object({ webhookId: z.uuid() });

export type WebhookInfoParamsDto = z.infer<typeof WebhookInfoParams>;
