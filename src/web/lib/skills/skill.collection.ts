import type { SkillResponse } from "@server/lib/skills/skill.api";
import { BTreeIndex } from "@tanstack/react-db";
import { api } from "@web/lib/api";
import {
  collection,
  persistSoftDeletableMutation,
} from "@web/lib/db/collection";
import { readListWindow } from "@web/lib/db/read-list-window";
import { toast } from "sonner";

export type Skill = typeof SkillResponse.Type;

export const skillsCollection = collection("skills", {
  syncMode: "eager",
  autoIndex: "eager",
  defaultIndexType: BTreeIndex<string>,
  queryFn: async ({ signal }) =>
    await readListWindow(
      async (page) =>
        await api(
          (client) =>
            client.skills.list({
              query: {
                offset: Number(page.offset),
                limit: Number(page.limit),
                order: "desc",
              },
            }),
          { signal }
        )
    ),
  getKey: (skill) => skill.id,
  onInsert: async ({ transaction, collection: skills }) => {
    await Promise.all(
      transaction.mutations.map(async ({ modified }) => {
        const { id, name, description, instructions } = modified;

        const skill = await api((client) =>
          client.skills.create({
            payload: { id, name, description, instructions },
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
        const params = { skillId: mutation.modified.id };

        await persistSoftDeletableMutation(mutation, {
          label: "Skill",
          upsert: skills.utils.writeUpsert,
          remove: async () =>
            await api((client) => client.skills.delete({ params })),
          restore: async () =>
            await api((client) => client.skills.restore({ params })),
          update: async ({ name, description, instructions }) =>
            await api((client) =>
              client.skills.update({
                params,
                payload: { name, description, instructions },
              })
            ),
        });
      })
    );
  },
});
