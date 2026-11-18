import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";
import { toast } from "sonner";

export type User = InferResponseType<
  typeof client.api.users.$get,
  200
>["items"][number];

export const usersCollection = collection("users", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(
          client.api.users.$get({ query: page }, { init: { signal } })
        )
    ),
  getKey: (user) => user.id,
  onUpdate: async ({ transaction, collection: users }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified }) => {
        const user = await parseResponse(
          client.api.users[":userId"].$patch({
            param: { userId: modified.id },
            json: { role: modified.role },
          })
        );

        await users.utils.writeUpsert(user);
        toast.success("User role updated");
      })
    );
  },
});
