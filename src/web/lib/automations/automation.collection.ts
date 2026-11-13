import type { QueryClient } from "@tanstack/query-core";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { readSubsetWindow } from "@web/lib/db/read-subset-window";
import { invalidateTaskSearchReads } from "@web/lib/tasks/task.collection";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";
import { toast } from "sonner";

export type Automation = InferResponseType<
  typeof client.api.automations.$get,
  200
>["items"][number];

// Automations of every accessible project, read by ID.
export const accessibleAutomationsCollection = collection(
  "automations:accessible",
  {
    syncMode: "on-demand",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex,
    queryFn: async ({ signal, meta }) =>
      await readSubsetWindow(
        async (query) =>
          await parseResponse(
            client.api.automations.$get({ query }, { init: { signal } })
          ),
        meta?.loadSubsetOptions,
        { equality: ["id"] }
      ),
    getKey: (automation) => automation.id,
  }
);

export function automationsCollection(projectId: string) {
  return collection(
    `automations:${projectId}`,
    {
      queryKey: ["automations", projectId],
      syncMode: "eager",
      autoIndex: "eager",
      defaultIndexType: BTreeIndex,
      queryFn: async ({ signal }) =>
        await readListWindow(
          async (page) =>
            await parseResponse(
              client.api.automations.$get(
                {
                  query: {
                    projectId,
                    ...page,
                  },
                },
                { init: { signal } }
              )
            )
        ),
      getKey: (automation) => automation.id,
    },
    (dbClient) => ({
      onUpdate: async ({ transaction, collection: automations }) => {
        await Promise.all(
          transaction.mutations.map(async (mutation) => {
            const api = client.api.automations[":automationId"];
            const param = { automationId: mutation.modified.id };

            await persistSoftDeletableMutation(mutation, {
              label: "Automation",
              upsert: automations.utils.writeUpsert,
              remove: async () => await parseResponse(api.$delete({ param })),
              restore: async () =>
                await parseResponse(api.restore.$post({ param })),
              update: async ({
                name,
                agentId,
                enabled,
                triggers,
                capabilities,
                dispatcher,
                ciRepositoryId,
              }) => {
                const automation = await parseResponse(
                  api.$patch({
                    param,
                    json: {
                      name,
                      agentId,
                      enabled,
                      triggers,
                      capabilities,
                      dispatcher,
                      ciRepositoryId,
                    },
                  })
                );

                if (automation.name !== mutation.original.name) {
                  await invalidateTaskSearchReads(
                    dbClient.requireDependency<QueryClient>("queryClient"),
                    automation.projectId
                  );
                }

                return automation;
              },
            });
          })
        );

        return { refetch: false };
      },
      onInsert: async ({ transaction, collection: automations }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            const { id, name, agentId } = modified;

            const automation = await parseResponse(
              client.api.automations.$post({
                json: { id, name, agentId, projectId },
              })
            );

            await automations.utils.writeUpsert(automation);
            toast.success("Automation created");
          })
        );

        return { refetch: false };
      },
    })
  );
}

export async function invalidateAutomations(
  dbClient: DbClient,
  projectId: string
) {
  await dbClient
    .requireDependency<QueryClient>("queryClient")
    .invalidateQueries({ queryKey: ["automations", projectId] });
}
