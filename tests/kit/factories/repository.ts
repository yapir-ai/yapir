import { repositoryTable } from "@server/lib/db/schema";
import type { RepositorySelect } from "@server/lib/db/schema";

export function repositoryRow(
  override?: Partial<RepositorySelect>
): RepositorySelect {
  return {
    id: "01960000-0000-7000-8000-000000000201",
    provider: "github",
    host: "github.com",
    externalId: "1001",
    path: "yapir-ai/playground",
    ...override,
  };
}

repositoryRow.table = repositoryTable;
