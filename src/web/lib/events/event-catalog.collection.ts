import type { QueryClient } from "@tanstack/query-core";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type EventDefinition = InferResponseType<
  (typeof client.api)["event-catalog"]["$get"],
  200
>[number];

export const eventCatalogCollection = collection("event-catalog", {
  staleTime: Infinity,
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex,
  queryFn: async ({ signal }) =>
    await parseResponse(
      client.api["event-catalog"].$get(undefined, { init: { signal } })
    ),
  getKey: (event) => event.type,
});

// The event types derive from the organization's webhooks: their changes make the catalog stale.
export async function invalidateEventCatalog(dbClient: DbClient) {
  await dbClient
    .requireDependency<QueryClient>("queryClient")
    .invalidateQueries({ queryKey: ["event-catalog"] });
}
