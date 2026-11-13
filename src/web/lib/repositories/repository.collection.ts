import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";

export type Repository = InferResponseType<
  typeof client.api.repositories.$get,
  200
>["items"][number];

export const repositoriesCollection = collection("repositories", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(
          client.api.repositories.$get({ query: page }, { init: { signal } })
        )
    ),
  getKey: (repository) => repository.id,
});
