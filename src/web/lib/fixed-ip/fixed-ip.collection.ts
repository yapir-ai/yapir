import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";

// The fixed IP of the instance is the collection's single item.
export const fixedIpCollection = collection("fixed-ip", {
  staleTime: Infinity,
  syncMode: "eager",
  queryFn: async ({ signal }) => [
    await parseResponse(
      client.api["fixed-ip"].$get(undefined, { init: { signal } })
    ),
  ],
  getKey: () => "fixed-ip",
});
