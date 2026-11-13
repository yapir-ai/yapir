import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { validateUIMessages } from "ai";
import type { UIMessage } from "ai";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type ExecutionMessage = Omit<
  InferResponseType<
    (typeof client.api)["execution-messages"]["$get"],
    200
  >["items"][number],
  "message"
> & { message: UIMessage };

export function executionMessagesCollection(taskId: string) {
  return collection(`execution-messages:${taskId}`, {
    queryKey: ["execution-messages", taskId],
    syncMode: "eager",
    queryFn: async ({ signal }) => {
      const items = await readListWindow(
        async (page) =>
          await parseResponse(
            client.api["execution-messages"].$get(
              { query: { taskId, ...page } },
              { init: { signal } }
            )
          )
      );

      return await Promise.all(
        items.map(async (item): Promise<ExecutionMessage> => ({
          ...item,
          message: (await validateUIMessages({ messages: [item.message] }))[0]!,
        }))
      );
    },
    getKey: (item) => item.id,
  });
}
