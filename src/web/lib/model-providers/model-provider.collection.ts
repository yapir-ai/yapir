import { ModelProviderCreateRequest } from "@server/lib/model-providers/model-provider-create.dto";
import type { ModelProviderUpdateRequestDto } from "@server/lib/model-providers/model-provider-update.dto";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api["model-providers"];

const InsertMetadata = ModelProviderCreateRequest.pick({ apiKey: true });

export const modelProvidersCollection = collection("model-providers", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(api.$get({ query: page }, { init: { signal } }))
    ),
  getKey: (modelProvider) => modelProvider.id,
  onInsert: async ({ transaction, collection: modelProviders }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified, metadata }) => {
        const { id, name, catalogId, baseUrl } = modified;

        const modelProvider = await parseResponse(
          api.$post({
            json: {
              id,
              name,
              catalogId,
              baseUrl,
              ...InsertMetadata.parse(metadata),
            },
          })
        );

        await modelProviders.utils.writeUpsert(modelProvider);
        toast.success("Model provider created");
      })
    );

    return { refetch: false };
  },
  onUpdate: async ({ transaction, collection: modelProviders }) => {
    await Promise.all(
      transaction.mutations.map(async (mutation) => {
        const param = { modelProviderId: mutation.modified.id };
        const item = api[":modelProviderId"];

        await persistSoftDeletableMutation(mutation, {
          label: "Model provider",
          upsert: modelProviders.utils.writeUpsert,
          remove: async () => await parseResponse(item.$delete({ param })),
          restore: async () =>
            await parseResponse(item.restore.$post({ param })),
        });
      })
    );

    return { refetch: false };
  },
});

// The API key is not part of the collection's items: an update carrying only the key changes none of them.
export async function updateModelProvider(
  dbClient: DbClient,
  modelProviderId: string,
  request: ModelProviderUpdateRequestDto
) {
  const modelProvider = await parseResponse(
    api[":modelProviderId"].$patch({
      param: { modelProviderId },
      json: request,
    })
  );

  await dbClient
    .collection(modelProvidersCollection)
    .utils.writeUpsert(modelProvider);
  toast.success("Model provider updated");
}
