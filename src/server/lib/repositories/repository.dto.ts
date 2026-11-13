import type { RepositorySelect } from "@server/lib/db/schema";

export const toResponseDto = (repository: RepositorySelect) => ({
  id: repository.id,
  provider: repository.provider,
  host: repository.host,
  path: repository.path,
});
