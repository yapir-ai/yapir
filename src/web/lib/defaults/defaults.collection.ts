import { DefaultsUpdateRequest } from "@server/lib/defaults/defaults-update.dto";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api.defaults;

// The organization's defaults are the collection's single item.
export const defaultsKey = "defaults";

export const defaultsCollection = collection(
  "defaults",
  {
    syncMode: "eager",
    queryFn: async ({ signal }) => [
      await parseResponse(api.$get(undefined, { init: { signal } })),
    ],
    getKey: () => defaultsKey,
  },
  (dbClient) => ({
    onUpdate: async ({ transaction, collection: defaults }) => {
      await Promise.all(
        transaction.mutations.map(async ({ original, changes }) => {
          const updated = await parseResponse(
            api.$patch({ json: DefaultsUpdateRequest.parse(changes) })
          );

          await defaults.utils.writeUpsert(updated);

          if (!original.modelProviderId) {
            await dbClient.collection(agentsCollection).utils.refetch();
          }

          toast.success("Defaults updated");
        })
      );

      return { refetch: false };
    },
  })
);
