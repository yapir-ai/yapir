import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { ApiEnv } from "@server/lib/env";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import type { GitHost } from "@server/lib/git/git-host";
import type { TaskService } from "@server/lib/tasks/task.service";

import { githubActionsDispatcher } from "./github-actions.dispatcher";
import { githubReference } from "./github-event";
import type { GithubInstallationOperation } from "./github-installation.operation";
import { githubIssueEvents } from "./github-issue.events";
import { githubPullRequestEvents } from "./github-pull-request.events";
import { githubRepositoryEvents } from "./github-repository.events";
import { githubWebhookDispatch } from "./github-webhook-dispatch";
import {
  githubCapabilities,
  githubPushCapability,
} from "./github.capabilities";
import { githubService } from "./github.service";

export function githubHost(
  connection: ConnectionOf<"github">,
  {
    db,
    env,
    effectService,
    eventFilterService,
    taskService,
    githubInstallationOperation,
  }: {
    db: Db;
    env: ApiEnv;
    effectService: EffectService;
    eventFilterService: EventFilterService;
    taskService: TaskService;
    githubInstallationOperation: GithubInstallationOperation;
  }
): GitHost {
  const services = {
    db,
    effectService,
    eventFilterService,
    taskService,
    githubService: githubService(connection, env),
  };

  return {
    provider: "github",
    events: [
      ...githubIssueEvents(services),
      ...githubPullRequestEvents(services),
      ...githubRepositoryEvents(services),
    ],
    capabilities: githubCapabilities(services),
    dispatchers: [githubActionsDispatcher({ ...services, env })],
    pushCapability: githubPushCapability,
    credential: async () => ({
      username: "x-access-token",
      password: await services.githubService.installationToken(),
    }),
    pushedCommit: ({ host, path }, sha) => ({
      reference: githubReference("commit", sha, host),
      url: `https://${host}/${path}/commit/${sha}`,
    }),
    receiveWebhook: async (request, { eventProcessOperation }) => {
      await githubWebhookDispatch(connection, {
        githubInstallationOperation,
        eventProcessOperation,
      }).execute(request);
    },
  };
}
