import { deletedFilter, infoQuery, query } from "@web/lib/db/query";

import { webhooksCollection } from "./webhook.collection";

export function webhookListQuery(showDeleted = false) {
  const visible = deletedFilter(showDeleted);

  return {
    queryKey: ["webhooks", showDeleted],
    ...query((q) =>
      q
        .from({ webhook: webhooksCollection })
        .fn.where(({ webhook }) => visible(webhook.deletedAt))
        .orderBy(({ webhook }) => webhook.name)
    ),
  };
}

export function webhookInfoQuery(webhookId: string) {
  return infoQuery(webhooksCollection, webhookId);
}
