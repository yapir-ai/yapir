import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type TaskEvent = InferResponseType<
  typeof client.api.events.$get,
  200
>["items"][number];

export function eventsCollection(taskId: string) {
  return collection(`events:${taskId}`, {
    queryKey: ["events", taskId],
    syncMode: "eager",
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(
            client.api.events.$get(
              {
                query: {
                  taskId,
                  ...page,
                },
              },
              { init: { signal } }
            )
          )
      ),
    getKey: (event) => event.eventId,
  });
}
