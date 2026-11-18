import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

export const agentsCollection = collection("agents", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(
          client.api.agents.$get({ query: page }, { init: { signal } })
        )
    ),
  getKey: (agent) => agent.id,
  onInsert: async ({ transaction, collection: agents }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified }) => {
        const {
          id,
          name,
          description,
          modelProviderId,
          model,
          effort,
          harness,
          prompt,
          skillIds,
        } = modified;

        const agent = await parseResponse(
          client.api.agents.$post({
            json: {
              id,
              name,
              description: description ?? undefined,
              modelProviderId,
              model,
              effort,
              harness,
              prompt,
              skillIds,
            },
          })
        );

        await agents.utils.writeUpsert(agent);
        toast.success("Agent created");
      })
    );
  },
  onUpdate: async ({ transaction, collection: agents }) => {
    await Promise.all(
      transaction.mutations.map(async (mutation) => {
        const api = client.api.agents[":agentId"];
        const param = { agentId: mutation.modified.id };

        await persistSoftDeletableMutation(mutation, {
          label: "Agent",
          upsert: agents.utils.writeUpsert,
          remove: async () => await parseResponse(api.$delete({ param })),
          restore: async () =>
            await parseResponse(api.restore.$post({ param })),
          update: async ({
            name,
            description,
            modelProviderId,
            model,
            effort,
            harness,
            prompt,
            skillIds,
            triggers,
            capabilities,
          }) =>
            await parseResponse(
              api.$patch({
                param,
                json: {
                  name,
                  description,
                  modelProviderId,
                  model,
                  effort,
                  harness,
                  prompt,
                  skillIds,
                  triggers,
                  capabilities,
                },
              })
            ),
        });
      })
    );
  },
});
