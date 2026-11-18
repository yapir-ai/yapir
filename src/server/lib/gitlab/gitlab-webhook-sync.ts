import { AccessLevel, Gitlab } from "@gitbeaker/rest";
import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";
import type { ApiEnv } from "@server/lib/env";
import { importRepositories } from "@server/lib/repositories/repository-import";

import { gitlabApiUrl } from "./gitlab.service";

export function gitlabWebhookSync(
  connection: ConnectionOf<"gitlab">,
  {
    db,
    env,
  }: {
    db: Db;
    env: Pick<ApiEnv, "SERVER_URL" | "WEBHOOK_URL" | "GITLAB_API_URL">;
  }
) {
  const gitlab = new Gitlab({
    host: gitlabApiUrl(connection, env),
    token: connection.token,
  });

  const url = new URL("/api/webhooks/gitlab", env.WEBHOOK_URL ?? env.SERVER_URL)
    .href;

  const hook = {
    pushEvents: true,
    tagPushEvents: true,
    releasesEvents: true,
    issuesEvents: true,
    confidentialIssuesEvents: true,
    noteEvents: true,
    confidentialNoteEvents: true,
    mergeRequestsEvents: true,
    pipelineEvents: true,
    signingToken: connection.webhookSigningToken,
  };

  async function execute() {
    const projects = await gitlab.Projects.all({
      minAccessLevel: AccessLevel.MAINTAINER,
      archived: false,
      simple: true,
      pagination: "offset",
      perPage: 100,
    });

    if (projects.length === 0) {
      return;
    }

    await Promise.all(
      projects.map(async ({ id }) => {
        const installed = (await gitlab.ProjectHooks.all(id)).find(
          (projectHook) => projectHook.url === url
        );

        await (installed
          ? gitlab.ProjectHooks.edit(id, installed.id, url, hook)
          : gitlab.ProjectHooks.add(id, url, hook));
      })
    );
    await importRepositories(
      db,
      projects.map((project) => ({
        provider: "gitlab",
        host: new URL(connection.url).hostname,
        externalId: String(project.id),
        path: project.path_with_namespace,
      }))
    );
  }

  return { execute };
}

export type GitlabWebhookSync = ReturnType<typeof gitlabWebhookSync>;
