import { OpenLink } from "@web/components/ui/open-link";

import { repositoryUrl } from "./repository-url";
import type { Repository } from "./repository.collection";

export function repositoryOpenLink(
  repositories: Pick<Repository, "id" | "host" | "path">[],
  repositoryId: string | null | undefined
) {
  const repository = repositories.find(({ id }) => id === repositoryId);

  return (
    repository && (
      <OpenLink
        to={repositoryUrl(repository)}
        target="_blank"
        rel="noreferrer"
        aria-label="Open repository"
      />
    )
  );
}
