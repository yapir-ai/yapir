import { skillTable } from "@server/lib/db/schema";
import type { SkillSelect } from "@server/lib/db/schema";

export function skillRow({
  authorId,
  ...override
}: Pick<SkillSelect, "authorId"> & Partial<SkillSelect>): SkillSelect {
  return {
    id: "01960000-0000-7000-8000-000000000901",
    name: "release-notes",
    description: "Write the release notes of a change.",
    instructions: "List the changes that a user sees.",
    authorId,
    deletedAt: null,
    ...override,
  };
}

skillRow.table = skillTable;
