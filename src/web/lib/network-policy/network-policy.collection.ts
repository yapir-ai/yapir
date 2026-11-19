import { NetworkPolicyUpdateRequest } from "@server/lib/network-policy/network-policy-update.dto";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api["network-policy"];

// The organization's network policy is the collection's single item.
export const networkPolicyKey = "network-policy";

export const networkPolicyCollection = collection("network-policy", {
  syncMode: "eager",
  queryFn: async ({ signal }) => [
    await parseResponse(api.$get(undefined, { init: { signal } })),
  ],
  getKey: () => networkPolicyKey,
  onUpdate: async ({ transaction, collection: networkPolicy }) => {
    await Promise.all(
      transaction.mutations.map(async ({ changes }) => {
        const updated = await parseResponse(
          api.$patch({ json: NetworkPolicyUpdateRequest.parse(changes) })
        );

        await networkPolicy.utils.writeUpsert(updated);
        toast.success("Network policy updated");
      })
    );
  },
});
