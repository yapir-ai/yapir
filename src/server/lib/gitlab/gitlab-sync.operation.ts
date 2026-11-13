import type { CurrentUser } from "@server/lib/auth/current-user";
import { notFound } from "@server/lib/errors/error.factory";

import type { GitlabWebhookSync } from "./gitlab-webhook-sync";

export function gitlabSyncOperation({
  currentUser,
  gitlabWebhookSync,
}: {
  currentUser: CurrentUser;
  gitlabWebhookSync: Promise<GitlabWebhookSync | undefined>;
}) {
  async function execute() {
    await currentUser.requireAdmin();
    const sync = await gitlabWebhookSync;

    if (!sync) {
      throw notFound("CONNECTION_NOT_FOUND");
    }

    await sync.execute();
  }

  return { execute };
}
