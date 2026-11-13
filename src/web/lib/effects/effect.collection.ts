import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type Effect = InferResponseType<
  typeof client.api.effects.$get,
  200
>["items"][number];

export const effectKey = ({
  integration,
  host,
  kind,
  externalId,
}: Pick<Effect, "integration" | "host" | "kind" | "externalId">) =>
  JSON.stringify([integration, host, kind, externalId]);

export function effectsCollection(taskId: string) {
  return collection(`effects:${taskId}`, {
    queryKey: ["effects", taskId],
    syncMode: "eager",
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(
            client.api.effects.$get(
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
    getKey: effectKey,
  });
}
