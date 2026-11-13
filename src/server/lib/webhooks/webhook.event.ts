import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import type { WebhookSelect } from "@server/lib/db/schema";
import type { TriggerEventDefinition } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import {
  occurrenceFormat,
  standaloneEvent,
} from "@server/lib/events/standalone-event";
import { triggeredAutomations } from "@server/lib/events/triggered-automations";
import { z } from "zod";

import { webhookEventType } from "./webhook.dto";

export const webhookDeliverySchema = z.object({
  body: z.json().describe("The delivery's JSON body"),
  headers: z
    .record(z.string(), z.string())
    .describe(
      "The delivery's headers, by lowercase name, without the authentication header"
    ),
});

interface WebhookEventDependencies {
  db: Db;
  clock: Clock;
  eventFilterService: EventFilterService;
}

// The deliveries of every webhook, deleted ones too: their past events and triggers still read.
export async function webhookEvents(dependencies: WebhookEventDependencies) {
  const webhooks = await dependencies.db.query.webhookTable.findMany({
    columns: { id: true, name: true, deletedAt: true },
  });

  return webhooks.map((webhook) => webhookEvent(webhook, dependencies));
}

function webhookEvent(
  webhook: Pick<WebhookSelect, "id" | "name" | "deletedAt">,
  { db, clock, eventFilterService }: WebhookEventDependencies
): TriggerEventDefinition {
  return {
    type: webhookEventType(webhook.id),
    provider: { id: "webhook", label: "Webhooks" },
    resource: { id: "delivery", label: "Deliveries" },
    label: webhook.deletedAt ? `${webhook.name} (deleted)` : webhook.name,
    webhookId: webhook.id,
    capabilities: [],
    schema: webhookDeliverySchema,
    // Each delivery starts its own task: a retry identifies the same one.
    prepare({ id, type, payload }) {
      return standaloneEvent({
        id: `webhook:${webhook.id}:${id}`,
        type,
        resource: {
          integration: "webhook",
          host: webhook.id,
          kind: "delivery",
          externalId: id,
        },
        label: `${webhook.name} · ${occurrenceFormat.format(clock.now)}`,
        data: webhookDeliverySchema.parse(payload),
      });
    },
    findCandidates: triggeredAutomations(db),
    filter: eventFilterService,
    present: () => ({}),
  };
}
