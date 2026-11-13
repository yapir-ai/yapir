import type { RepositorySelect } from "@server/lib/db/schema";

export type RepositoryProvider = RepositorySelect["provider"];

export function fitsProject(
  { gitHost }: { gitHost?: RepositoryProvider },
  project: { repositories: { provider: RepositoryProvider }[] }
) {
  return (
    gitHost === undefined ||
    project.repositories.some(({ provider }) => provider === gitHost)
  );
}
