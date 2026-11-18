import type { QueryClient } from "@tanstack/query-core";
import { BTreeIndex } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { invalidateAutomations } from "@web/lib/automations/automation.collection";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";
import { toast } from "sonner";

export type Project = InferResponseType<
  typeof client.api.projects.$get,
  200
>["items"][number];

export const projectsCollection = collection(
  "projects",
  {
    syncMode: "eager",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex<string>,
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(
            client.api.projects.$get({ query: page }, { init: { signal } })
          )
      ),
    getKey: (project) => project.id,
    onInsert: async ({ transaction, collection: projects }) => {
      await Promise.all(
        transaction.mutations.map(async ({ modified }) => {
          const { id, name, instructions } = modified;

          const project = await parseResponse(
            client.api.projects.$post({ json: { id, name, instructions } })
          );

          await projects.utils.writeUpsert(project);
          toast.success("Project created");
        })
      );
    },
  },
  (dbClient) => ({
    onUpdate: async ({ transaction, collection: projects }) => {
      await Promise.all(
        transaction.mutations.map(async (mutation) => {
          const api = client.api.projects[":projectId"];
          const param = { projectId: mutation.modified.id };

          const intent = await persistSoftDeletableMutation(mutation, {
            label: "Project",
            upsert: projects.utils.writeUpsert,
            remove: async () => await parseResponse(api.$delete({ param })),
            restore: async () =>
              await parseResponse(api.restore.$post({ param })),
            update: async ({ name, instructions, ciRepositoryId }) =>
              await parseResponse(
                api.$patch({
                  param,
                  json: {
                    name,
                    instructions,
                    ciRepositoryId: ciRepositoryId ?? undefined,
                  },
                })
              ),
          });

          if (intent === "delete") {
            await invalidateAutomations(dbClient, param.projectId);
          }
        })
      );
    },
  })
);

export async function invalidateProjects(dbClient: DbClient) {
  await dbClient
    .requireDependency<QueryClient>("queryClient")
    .invalidateQueries({ queryKey: ["projects"] });
}
