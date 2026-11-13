import { projectTable } from "@server/lib/db/schema";
import type { ProjectSelect } from "@server/lib/db/schema";

export function projectRow(override?: Partial<ProjectSelect>): ProjectSelect {
  return {
    id: "01960000-0000-7000-8000-000000000501",
    name: "Playground",
    instructions: "",
    ciRepositoryId: null,
    deletedAt: null,
    ...override,
  };
}

projectRow.table = projectTable;
