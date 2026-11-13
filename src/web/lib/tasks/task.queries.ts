import { eq } from "@tanstack/react-db";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import { automationsCollection } from "@web/lib/automations/automation.collection";
import { query } from "@web/lib/db/query";
import { effectsCollection } from "@web/lib/effects/effect.collection";
import { eventsCollection } from "@web/lib/events/event.collection";
import { executionMessagesCollection } from "@web/lib/executions/execution-message.collection";
import {
  executionsCollection,
  latestExecutionsCollection,
} from "@web/lib/executions/execution.collection";
import { listPageSize } from "@web/lib/lists/list.route";

import { tasksCollection } from "./task.collection";
import type { TaskListFilters } from "./task.route";

export function taskListQuery(
  projectId: string,
  { search, state, automationId, offset }: TaskListFilters
) {
  const source = tasksCollection({
    projectId,
    search: search || undefined,
    state: state && [state],
  });

  return query((q) => {
    const tasks = q.from({ task: source });

    const taskWindow = (
      automationId
        ? tasks.where(({ task }) => eq(task.automationId, automationId))
        : tasks
    )
      .orderBy(({ task }) => task.stateChangedAt, "desc")
      .orderBy(({ task }) => task.id, "desc")
      .offset(offset)
      .limit(listPageSize + 1);

    return q
      .from({ task: taskWindow })
      .leftJoin(
        { execution: latestExecutionsCollection },
        ({ task, execution }) => eq(task.id, execution.taskId)
      )
      .leftJoin(
        { automation: automationsCollection(projectId) },
        ({ task, automation }) => eq(task.automationId, automation.id)
      )
      .leftJoin({ agent: agentsCollection }, ({ automation, agent }) =>
        eq(automation.agentId, agent.id)
      )
      .orderBy(({ task }) => task.stateChangedAt, "desc")
      .orderBy(({ task }) => task.id, "desc");
  });
}

export function taskInfoQuery(projectId: string, taskId: string) {
  return query((q) =>
    q
      .from({ task: tasksCollection({ projectId }) })
      .where(({ task }) => eq(task.id, taskId))
      .leftJoin(
        { automation: automationsCollection(projectId) },
        ({ task, automation }) => eq(task.automationId, automation.id)
      )
      .leftJoin({ agent: agentsCollection }, ({ automation, agent }) =>
        eq(automation.agentId, agent.id)
      )
      .findOne()
  );
}

export function taskExecutionsQuery(taskId: string) {
  return query((q) =>
    q
      .from({ execution: executionsCollection(taskId) })
      .orderBy(({ execution }) => execution.queuedAt)
      .orderBy(({ execution }) => execution.id)
  );
}

export function taskEventsQuery(taskId: string) {
  return query((q) =>
    q
      .from({ event: eventsCollection(taskId) })
      .orderBy(({ event }) => event.receivedAt)
  );
}

export function taskEffectsQuery(taskId: string) {
  return query((q) =>
    q
      .from({ effect: effectsCollection(taskId) })
      .orderBy(({ effect }) => effect.createdAt)
  );
}

export function taskMessagesQuery(taskId: string) {
  return query((q) =>
    q
      .from({ message: executionMessagesCollection(taskId) })
      .orderBy(({ message }) => message.id)
  );
}
