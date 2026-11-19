import { ConnectionCreateRequest } from "@server/lib/connections/connection-create.dto";
import type { ConnectionUpdateRequestDto } from "@server/lib/connections/connection-update.dto";
import type { ConnectionType } from "@server/lib/connections/connection.dto";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { repositoriesCollection } from "@web/lib/repositories/repository.collection";
import { parseResponse } from "hono/client";
import { toast } from "sonner";
import { z } from "zod";

const api = client.api.connections;

const InsertMetadata = z.record(z.string(), z.string());

export const connectionsCollection = collection("connections", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(api.$get({ query: page }, { init: { signal } }))
    ),
  getKey: (connection) => connection.type,
  onInsert: async ({ transaction, collection: connections }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified, metadata }) => {
        const connection = await parseResponse(
          api.$post({
            json: ConnectionCreateRequest.parse({
              ...modified,
              ...InsertMetadata.parse(metadata),
            }),
          })
        );

        await connections.utils.writeUpsert(connection);
        toast.success("Connection created");
      })
    );
  },
  onDelete: async ({ transaction, collection: connections }) => {
    await Promise.all(
      transaction.mutations.map(async ({ original }) => {
        await parseResponse(
          api[":type"].$delete({ param: { type: original.type } })
        );
        await connections.utils.writeDelete(original.type);
        toast.success("Connection deleted");
      })
    );
  },
});

// The secrets are not part of the collection's items: an update carrying only secrets changes none of them.
export async function updateConnection(
  dbClient: DbClient,
  type: ConnectionType,
  request: ConnectionUpdateRequestDto
) {
  const connection = await parseResponse(
    api[":type"].$patch({ param: { type }, json: request })
  );

  await dbClient
    .collection(connectionsCollection)
    .utils.writeUpsert(connection);
  toast.success("Connection updated");
}

export async function syncGitlab(dbClient: DbClient) {
  await parseResponse(api.gitlab.sync.$post());
  await dbClient.collection(repositoriesCollection).utils.refetch();
}
