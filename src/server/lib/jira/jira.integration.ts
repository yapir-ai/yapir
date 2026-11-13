import type { ConnectionOf } from "@server/lib/connections/connection.dto";
import type { Db } from "@server/lib/db";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { ApiEnv } from "@server/lib/env";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import type { TaskService } from "@server/lib/tasks/task.service";

import { jiraSite } from "./jira-event";
import { jiraIssueEvents } from "./jira-issue.events";
import { jiraCapabilities } from "./jira.capabilities";
import { jiraService } from "./jira.service";

export function jiraIntegration(
  connection: ConnectionOf<"jira">,
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
) {
  const dependencies = {
    db,
    effectService,
    eventFilterService,
    taskService,
    site: jiraSite(connection.url),
    jiraService: jiraService(connection, env),
  };

  return {
    events: jiraIssueEvents(dependencies),
    capabilities: jiraCapabilities(dependencies),
  };
}

export type JiraIntegration = ReturnType<typeof jiraIntegration>;
