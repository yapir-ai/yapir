import { AutomationUpdateRequest } from "@server/lib/automations/automation-update.dto";
import type { Trigger } from "@server/lib/automations/automation.dto";
import { expressionTriggerSchema } from "@server/lib/automations/automation.dto";
import { eventFilterService } from "@server/lib/events/event-filter.service";
import {
  isValidCron,
  scheduleEventType,
  scheduleTriggerSchema,
} from "@server/lib/schedules/schedule.trigger";
import { z } from "zod";

const { check } = eventFilterService();

export const AutomationTriggerForm = z.union([
  scheduleTriggerSchema.refine((trigger) => isValidCron(trigger.cron), {
    path: ["cron"],
    message: "The cron must be a valid pattern.",
  }),
  expressionTriggerSchema.superRefine((trigger, ctx) => {
    const reason = check(trigger);

    if (reason) {
      ctx.addIssue({ code: "custom", path: ["expression"], message: reason });
    }
  }),
]);

export const AutomationUpdateForm = AutomationUpdateRequest.required()
  .omit({ enabled: true })
  .extend({
    triggers: z.array(AutomationTriggerForm),
  });

export function emptyTrigger(type: string): Trigger {
  return type === scheduleEventType
    ? { type, cron: "" }
    : { type, expression: "false" };
}
