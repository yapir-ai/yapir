import type { client } from "@web/lib/api";
import { capabilitiesCollection } from "@web/lib/capabilities/capability.collection";
import { query } from "@web/lib/db/query";
import { dispatchersCollection } from "@web/lib/dispatchers/dispatcher.collection";
import { eventCatalogCollection } from "@web/lib/events/event-catalog.collection";
import { webhooksCollection } from "@web/lib/webhooks/webhook.collection";
import type { InferResponseType } from "hono/client";

export type AutomationCapability = InferResponseType<
  typeof client.api.capabilities.$get,
  200
>[number];

export const automationEventsQuery = query((q) =>
  q.from({ event: eventCatalogCollection }).orderBy(({ event }) => event.type)
);

// Deleted webhooks: their triggers still read, but no new trigger selects them.
export const deletedWebhooksQuery = {
  queryKey: ["webhooks", "deleted"],
  ...query((q) =>
    q
      .from({ webhook: webhooksCollection })
      .fn.where(({ webhook }) => webhook.deletedAt !== null)
  ),
};

export const automationCapabilitiesQuery = query((q) =>
  q
    .from({ capability: capabilitiesCollection })
    .orderBy(({ capability }) => capability.name)
);

export const automationDispatchersQuery = query((q) =>
  q
    .from({ dispatcher: dispatchersCollection })
    .orderBy(({ dispatcher }) => dispatcher.label)
);
