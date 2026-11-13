import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";

export const providerCatalogCollection = collection("provider-catalog", {
  staleTime: Infinity,
  syncMode: "eager",
  queryFn: async ({ signal }) =>
    await parseResponse(
      client.api["provider-catalog"].$get(undefined, { init: { signal } })
    ),
  getKey: (provider) => provider.id,
});
