import { eq, isUndefined } from "@tanstack/react-db";
import { query } from "@web/lib/db/query";
import { repositoriesCollection } from "@web/lib/repositories/repository.collection";

import { projectRepositoriesCollection } from "./project-repository.collection";

export function projectRepositoryListQuery(projectId: string) {
  return query((q) =>
    q
      .from({ link: projectRepositoriesCollection(projectId) })
      .innerJoin(
        { repository: repositoriesCollection },
        ({ link, repository }) => eq(link.repositoryId, repository.id)
      )
      .orderBy(({ repository }) => repository.path)
      .select(({ repository }) => ({ ...repository }))
  );
}

// Repositories that the project does not contain.
export function projectNonRepositoryListQuery(projectId: string) {
  return query((q) =>
    q
      .from({ repository: repositoriesCollection })
      .leftJoin(
        { link: projectRepositoriesCollection(projectId) },
        ({ repository, link }) => eq(repository.id, link.repositoryId)
      )
      .where(({ link }) => isUndefined(link))
      .orderBy(({ repository }) => repository.path)
      .select(({ repository }) => ({ ...repository }))
  );
}
