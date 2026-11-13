import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";

export const dispatchersCollection = collection("dispatchers", {
  staleTime: Infinity,
  syncMode: "eager",
  queryFn: async ({ signal }) =>
    await parseResponse(
      client.api.dispatchers.$get(undefined, { init: { signal } })
    ),
  getKey: (dispatcher) => dispatcher.name,
});
