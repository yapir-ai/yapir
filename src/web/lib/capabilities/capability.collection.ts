import type { QueryClient } from "@tanstack/query-core";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";

export const capabilitiesCollection = collection("capabilities", {
  staleTime: Infinity,
  syncMode: "eager",
  queryFn: async ({ signal }) =>
    await parseResponse(
      client.api.capabilities.$get(undefined, { init: { signal } })
    ),
  getKey: (capability) => capability.name,
});

// The capabilities derive from the organization's MCP servers: their changes make the catalog stale.
export async function invalidateCapabilities(dbClient: DbClient) {
  await dbClient
    .requireDependency<QueryClient>("queryClient")
    .invalidateQueries({ queryKey: ["capabilities"] });
}
