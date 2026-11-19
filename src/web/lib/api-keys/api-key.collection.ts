import { authClient } from "@web/lib/auth/auth-client";
import { collection } from "@web/lib/db/collection";
import { toast } from "sonner";

// The current user's API keys. Creation returns the secret key once: the page creates keys and writes them here.
export const apiKeysCollection = collection("api-keys", {
  syncMode: "eager",
  queryFn: async () =>
    (await authClient.apiKey.list({ fetchOptions: { throw: true } })).apiKeys,
  getKey: (apiKey) => apiKey.id,
  onDelete: async ({ transaction, collection: apiKeys }) => {
    await Promise.all(
      transaction.mutations.map(async ({ original }) => {
        await authClient.apiKey.delete({
          keyId: original.id,
          fetchOptions: { throw: true },
        });
        await apiKeys.utils.writeDelete(original.id);
        toast.success("API key deleted");
      })
    );
  },
});
