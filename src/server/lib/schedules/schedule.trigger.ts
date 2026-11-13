import { Cron } from "croner";
import { z } from "zod";

export const scheduleEventType = "schedule.cron";

export const scheduleTriggerSchema = z.object({
  type: z.literal(scheduleEventType),
  cron: z
    .string()
    .trim()
    .min(1)
    .describe("Cron pattern, in UTC, to the minute"),
});

export function isValidCron(cron: string) {
  try {
    return new Cron(cron).getPattern() !== undefined;
  } catch {
    return false;
  }
}
