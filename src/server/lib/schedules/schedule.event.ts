import type { Db } from "@server/lib/db";
import type { TriggerEventDefinition } from "@server/lib/events/event-definition";
import {
  occurrenceFormat,
  standaloneEvent,
} from "@server/lib/events/standalone-event";
import { triggeredAutomations } from "@server/lib/events/triggered-automations";
import { Cron } from "croner";
import { z } from "zod";

import { isValidCron, scheduleEventType } from "./schedule.trigger";

const schema = z.object({
  scheduledTime: z
    .number()
    .int()
    .nonnegative()
    .describe("The occurrence's time, in milliseconds since the Unix epoch"),
});

export function scheduleEvent({ db }: { db: Db }): TriggerEventDefinition {
  return {
    type: scheduleEventType,
    provider: { id: "schedule", label: "Schedule" },
    resource: { id: "cron", label: "Cron" },
    label: "Scheduled occurrence",
    capabilities: [],
    schema,
    prepare({ type, payload }) {
      const data = schema.parse(payload);

      return standaloneEvent({
        id: `schedule:${data.scheduledTime}`,
        type,
        resource: {
          integration: "schedule",
          host: "yapir",
          kind: "occurrence",
          externalId: String(data.scheduledTime),
        },
        label: occurrenceFormat.format(data.scheduledTime),
        data,
      });
    },
    findCandidates: triggeredAutomations(db),
    present: () => ({}),
    filter: {
      check: (trigger) =>
        "cron" in trigger && isValidCron(trigger.cron)
          ? undefined
          : "This event type needs a valid cron pattern",
      matches: (trigger, event) =>
        "cron" in trigger &&
        new Cron(trigger.cron).match(
          new Date(schema.parse(event.data).scheduledTime)
        ),
    },
  };
}
