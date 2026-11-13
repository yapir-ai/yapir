import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";

export const conversationsCollection = collection("conversations", {
  syncMode: "eager",
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(
          client.api.conversations.$get({ query: page }, { init: { signal } })
        )
    ),
  getKey: (conversation) => conversation.id,
});
