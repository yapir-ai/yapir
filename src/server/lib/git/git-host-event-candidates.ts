import type { Db } from "@server/lib/db";
import type { ResourceReference } from "@server/lib/events/event-definition";

import type { RepositoryProvider } from "./repository-provider";

export function gitHostEventCandidates(db: Db, provider: RepositoryProvider) {
  return async ({ source }: { source: ResourceReference }) =>
    await db.query.automationTable.findMany({
      where: {
        enabled: true,
        project: {
          repositories: {
            provider,
            host: source.host,
            externalId: source.externalId,
          },
        },
      },
    });
}
