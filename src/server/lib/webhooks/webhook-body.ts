import { badRequest } from "@server/lib/errors/error.factory";
import type { z } from "zod";

// The body must be JSON: a parse failure is the sender's error.
export function parseWebhookBody<Schema extends z.ZodType>(
  schema: Schema,
  body: string
): z.infer<Schema> {
  try {
    return schema.parse(JSON.parse(body));
  } catch {
    throw badRequest("WEBHOOK_BODY_INVALID");
  }
}
