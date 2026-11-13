import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const WebhookListRequest = IdListRequest;

export type WebhookListRequestDto = z.infer<typeof WebhookListRequest>;
