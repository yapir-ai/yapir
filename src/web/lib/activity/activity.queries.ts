import { coalesce, eq } from "@tanstack/react-db";
import { agentsCollection } from "@web/lib/agents/agent.collection";
import {
  accessibleAutomationsCollection,
  automationsCollection,
} from "@web/lib/automations/automation.collection";
import { query } from "@web/lib/db/query";
import { executionListCollection } from "@web/lib/executions/execution.collection";
import { projectsCollection } from "@web/lib/projects/project.collection";
import { tasksCollection } from "@web/lib/tasks/task.collection";

const activityListSize = 5;

export function needsAttentionQuery(projectId?: string) {
  return executionRowsQuery(
    executionListCollection({ projectId, outcome: ["failed"], latest: "true" }),
    activityListSize,
    projectId
  );
}

export function runningNowQuery(projectId?: string) {
  return executionRowsQuery(
    executionListCollection({ projectId, active: "true" }),
    activityListSize,
    projectId
  );
}

function executionRowsQuery(
  source: ReturnType<typeof executionListCollection>,
  size: number,
  projectId?: string
) {
  return query((q) => {
    const executions = q
      .from({ execution: source })
      .orderBy(({ execution }) => execution.id, "desc")
      .limit(size);

    // An execution fixes its agent at claim: until then, it shows its automation's.
    return q
      .from({ execution: executions })
      .leftJoin(
        { task: tasksCollection({ projectId }) },
        ({ execution, task }) => eq(execution.taskId, task.id)
      )
      .leftJoin(
        {
          automation: projectId
            ? automationsCollection(projectId)
            : accessibleAutomationsCollection,
        },
        ({ task, automation }) => eq(task.automationId, automation.id)
      )
      .leftJoin(
        { agent: agentsCollection },
        ({ execution, automation, agent }) =>
          eq(coalesce(execution.agentId, automation.agentId), agent.id)
      )
      .leftJoin({ project: projectsCollection }, ({ automation, project }) =>
        eq(automation.projectId, project.id)
      )
      .orderBy(({ execution }) => execution.id, "desc")
      .select(({ execution, task, agent, project }) => ({
        execution,
        task,
        agent,
        project,
      }));
  });
}
