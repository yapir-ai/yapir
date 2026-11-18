import { BTreeIndex } from "@tanstack/react-db";
import { client } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { parseResponse } from "hono/client";
import type { InferResponseType } from "hono/client";
import { toast } from "sonner";

export type Skill = InferResponseType<
  typeof client.api.skills.$get,
  200
>["items"][number];

const api = client.api.skills[":skillId"];

export const skillsCollection = collection("skills", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await parseResponse(
          client.api.skills.$get({ query: page }, { init: { signal } })
        )
    ),
  getKey: (skill) => skill.id,
  onInsert: async ({ transaction, collection: skills }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified }) => {
        const { id, name, description, instructions } = modified;

        const skill = await parseResponse(
          client.api.skills.$post({
            json: { id, name, description, instructions },
          })
        );

        await skills.utils.writeUpsert(skill);
        toast.success("Skill created");
      })
    );
  },
  onUpdate: async ({ transaction, collection: skills }) => {
    await Promise.all(
      transaction.mutations.map(async (mutation) => {
        const param = { skillId: mutation.modified.id };

        await persistSoftDeletableMutation(mutation, {
          label: "Skill",
          upsert: skills.utils.writeUpsert,
          remove: async () => await parseResponse(api.$delete({ param })),
          restore: async () =>
            await parseResponse(api.restore.$post({ param })),
          update: async ({ name, description, instructions }) =>
            await parseResponse(
              api.$patch({ param, json: { name, description, instructions } })
            ),
        });
      })
    );
  },
});
