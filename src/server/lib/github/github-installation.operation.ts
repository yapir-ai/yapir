import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { Db } from "@server/lib/db";
import { importRepositories } from "@server/lib/repositories/repository-import";

export function githubInstallationOperation({ db }: { db: Db }) {
  async function execute(
    payload:
      | EmitterWebhookEvent<"installation.created">["payload"]
      | EmitterWebhookEvent<"installation_repositories.added">["payload"]
  ) {
    const repositoriesToAdd =
      payload.action === "added"
        ? payload.repositories_added
        : (payload.repositories ?? []);

    if (repositoriesToAdd.length === 0) {
      return;
    }

    await importRepositories(
      db,
      repositoriesToAdd.map((repo) => ({
        provider: "github",
        host: "github.com",
        externalId: String(repo.id),
        path: repo.full_name,
      }))
    );
  }

  return { execute };
}

export type GithubInstallationOperation = ReturnType<
  typeof githubInstallationOperation
>;
