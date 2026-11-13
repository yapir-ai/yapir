import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import { toast } from "sonner";

const api = client.api.projects[":projectId"].members;

export function projectMembersCollection(projectId: string) {
  return collection(`project-members:${projectId}`, {
    queryKey: ["project-members", projectId],
    syncMode: "eager",
    autoIndex: "eager",
    defaultIndexType: BTreeIndex,
    queryFn: async ({ signal }) =>
      await readListWindow(
        async (page) =>
          await parseResponse(
            api.$get(
              {
                param: { projectId },
                query: page,
              },
              { init: { signal } }
            )
          )
      ),
    getKey: (member) => member.userId,
    onInsert: async ({ transaction, collection: members }) => {
      await Promise.all(
        transaction.mutations.map(async ({ modified }) => {
          const { userId, role } = modified;

          const member = await parseResponse(
            api.$post({ param: { projectId }, json: { userId, role } })
          );

          await members.utils.writeUpsert(member);
          toast.success("Member added");
        })
      );

      return { refetch: false };
    },
    onUpdate: async ({ transaction, collection: members }) => {
      await Promise.all(
        transaction.mutations.map(async ({ modified }) => {
          const member = await parseResponse(
            api[":userId"].$patch({
              param: { projectId, userId: modified.userId },
              json: { role: modified.role },
            })
          );

          await members.utils.writeUpsert(member);
          toast.success("Member role updated");
        })
      );

      return { refetch: false };
    },
    onDelete: async ({ transaction, collection: members }) => {
      await Promise.all(
        transaction.mutations.map(async ({ original }) => {
          await parseResponse(
            api[":userId"].$delete({
              param: { projectId, userId: original.userId },
            })
          );
          await members.utils.writeDelete(original.userId);
          toast.success("Member removed");
        })
      );

      return { refetch: false };
    },
  });
}
