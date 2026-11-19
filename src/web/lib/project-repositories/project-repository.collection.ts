import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { invalidateProjects } from "@web/lib/projects/project.collection";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api.projects[":projectId"].repositories;

export function projectRepositoriesCollection(projectId: string) {
  return collection(
    `project-repositories:${projectId}`,
    {
      queryKey: ["project-repositories", projectId],
      syncMode: "eager",
      autoIndex: "eager",
      defaultIndexType: BTreeIndex,
      queryFn: async ({ signal }) =>
        await readListWindow(
          async (page) =>
            await parseResponse(
              api.$get(
                { param: { projectId }, query: page },
                { init: { signal } }
              )
            )
        ),
      getKey: (link) => link.repositoryId,
    },
    (dbClient) => ({
      onInsert: async ({ transaction, collection: links }) => {
        await Promise.all(
          transaction.mutations.map(async ({ modified }) => {
            const link = await parseResponse(
              api.$post({
                param: { projectId },
                json: { repositoryId: modified.repositoryId },
              })
            );

            await links.utils.writeUpsert(link);
            toast.success("Repository added");
          })
        );
        await invalidateProjects(dbClient);
      },
      onDelete: async ({ transaction, collection: links }) => {
        await Promise.all(
          transaction.mutations.map(async ({ original }) => {
            await parseResponse(
              api[":repositoryId"].$delete({
                param: { projectId, repositoryId: original.repositoryId },
              })
            );
            await links.utils.writeDelete(original.repositoryId);
            toast.success("Repository removed");
          })
        );
        await invalidateProjects(dbClient);
      },
    })
  );
}
