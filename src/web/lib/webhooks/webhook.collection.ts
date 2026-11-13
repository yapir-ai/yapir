import { WebhookCreateRequest } from "@server/lib/webhooks/webhook-create.dto";
import type { WebhookUpdateRequestDto } from "@server/lib/webhooks/webhook-update.dto";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { invalidateEventCatalog } from "@web/lib/events/event-catalog.collection";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api.webhooks;

const InsertMetadata = WebhookCreateRequest.pick({ secret: true });

export const webhooksCollection = collection(
  "webhooks",
  {
    syncMode: "eager",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex<string>,
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(api.$get({ query: page }, { init: { signal } }))
      ),
    getKey: (webhook) => webhook.id,
  },
  (dbClient) => ({
    onInsert: async ({ transaction, collection: webhooks }) => {
      await Promise.all(
        transaction.mutations.map(async ({ modified, metadata }) => {
          const { id, name, auth, headerName, prefix, deliveryIdHeader } =
            modified;

          const webhook = await parseResponse(
            api.$post({
              json: {
                id,
                name,
                auth,
                headerName,
                prefix: prefix ?? undefined,
                deliveryIdHeader: deliveryIdHeader ?? undefined,
                ...InsertMetadata.parse(metadata),
              },
            })
          );

          await webhooks.utils.writeUpsert(webhook);
          toast.success("Webhook created");
        })
      );
      await invalidateEventCatalog(dbClient);

      return { refetch: false };
    },
    onUpdate: async ({ transaction, collection: webhooks }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const param = { webhookId: mutation.modified.id };
          const item = api[":webhookId"];

          await persistSoftDeletableMutation(mutation, {
            label: "Webhook",
            upsert: webhooks.utils.writeUpsert,
            remove: async () => await parseResponse(item.$delete({ param })),
            restore: async () =>
              await parseResponse(item.restore.$post({ param })),
          });
        })
      );
      await invalidateEventCatalog(dbClient);

      return { refetch: false };
    },
  })
);

// The secret is not part of the collection's items: an update carrying only the secret changes none of them.
export async function updateWebhook(
  dbClient: DbClient,
  webhookId: string,
  request: WebhookUpdateRequestDto
) {
  const webhook = await parseResponse(
    api[":webhookId"].$patch({ param: { webhookId }, json: request })
  );

  await dbClient.collection(webhooksCollection).utils.writeUpsert(webhook);
  await invalidateEventCatalog(dbClient);
  toast.success("Webhook updated");
}
