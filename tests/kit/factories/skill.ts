import { skillTable } from "@server/lib/db/schema";
import type { SkillSelect } from "@server/lib/db/schema";

export function skillRow({
  authorId,
  ...override
}: Pick<SkillSelect, "authorId"> & Partial<SkillSelect>): SkillSelect {
  return {
    id: "01960000-0000-7000-8000-000000000601",
    name: "code-review",
    description: "Review a pull request.",
    instructions: "Read the diff, then comment.",
    authorId,
    deletedAt: null,
    ...override,
  };
}

skillRow.table = skillTable;
