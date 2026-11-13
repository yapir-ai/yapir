import { Gitlab } from "@gitbeaker/rest";
import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { ApiEnv } from "@server/lib/env";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import type { GitHost } from "@server/lib/git/git-host";
import type { TaskService } from "@server/lib/tasks/task.service";

import { gitlabCiDispatcher } from "./gitlab-ci.dispatcher";
import { gitlabReference } from "./gitlab-event";
import { gitlabIssueEvents } from "./gitlab-issue.events";
import { gitlabMergeRequestEvents } from "./gitlab-merge-request.events";
import { gitlabRepositoryEvents } from "./gitlab-repository.events";
import { gitlabWebhookDispatch } from "./gitlab-webhook-dispatch";
import {
  gitlabCapabilities,
  gitlabPushCapability,
} from "./gitlab.capabilities";
import { gitlabApiUrl, gitlabService } from "./gitlab.service";

export function gitlabHost(
  connection: ConnectionOf<"gitlab">,
  {
    db,
    env,
    effectService,
    eventFilterService,
    taskService,
  }: {
    db: Db;
    env: ApiEnv;
    effectService: EffectService;
    eventFilterService: EventFilterService;
    taskService: TaskService;
  }
): GitHost {
  const services = {
    db,
    effectService,
    eventFilterService,
    taskService,
    host: new URL(connection.url).hostname,
    gitlab: new Gitlab({
      host: gitlabApiUrl(connection, env),
      token: connection.token,
    }),
    gitlabService: gitlabService(connection, env),
  };

  return {
    provider: "gitlab",
    events: [
      ...gitlabIssueEvents(services),
      ...gitlabMergeRequestEvents(services),
      ...gitlabRepositoryEvents(services),
    ],
    capabilities: gitlabCapabilities(services),
    dispatchers: [
      gitlabCiDispatcher({
        env,
        gitlab: services.gitlab,
        url: new URL(connection.url).origin,
      }),
    ],
    pushCapability: gitlabPushCapability,
    credential: () => ({ username: "oauth2", password: connection.token }),
    pushedCommit: ({ host, path }, sha) => ({
      reference: gitlabReference(host, "commit", sha),
      url: `https://${host}/${path}/-/commit/${sha}`,
    }),
    receiveWebhook: async (request, { eventProcessOperation }) => {
      await gitlabWebhookDispatch(connection, {
        ...services,
        eventProcessOperation,
      }).execute(request);
    },
  };
}
