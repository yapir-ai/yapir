import type { AgentSelect, AutomationSelect } from "@server/lib/db/schema";
import { hashSecret } from "@server/lib/executions/execution-secret";

import { agentRow } from "./factories/agent";
import { automationRow } from "./factories/automation";
import { executionRow } from "./factories/execution";
import { modelProviderRow } from "./factories/model-provider";
import { projectRow } from "./factories/project";
import { taskRow } from "./factories/task";
import type { inserter } from "./insert";

export const executionToken = "execution-token";

// An execution in progress, of the agent of an automation, with the token its agent holds.
export async function insertRunningExecution(
  insert: ReturnType<typeof inserter>,
  {
    capabilities,
    agent: agentOverride,
  }: Pick<AutomationSelect, "capabilities"> & { agent?: Partial<AgentSelect> }
) {
  const modelProvider = await insert(modelProviderRow);

  const agent = await insert(agentRow, {
    modelProviderId: modelProvider.id,
    ...agentOverride,
  });

  const project = await insert(projectRow);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    capabilities,
  });

  const executionId = "01960000-0000-7000-8000-000000000701";

  const task = await insert(taskRow, {
    automationId: automation.id,
    state: "running",
    activeExecutionId: executionId,
  });

  const execution = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    tokenHash: hashSecret(executionToken),
    endedAt: null,
  });

  return { modelProvider, agent, project, automation, task, execution };
}
