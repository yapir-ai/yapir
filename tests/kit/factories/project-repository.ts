import { projectRepositoryTable } from "@server/lib/db/schema";
import type { ProjectRepositorySelect } from "@server/lib/db/schema";

export function projectRepositoryRow(
  row: ProjectRepositorySelect
): ProjectRepositorySelect {
  return row;
}

projectRepositoryRow.table = projectRepositoryTable;
