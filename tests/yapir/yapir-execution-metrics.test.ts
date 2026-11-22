import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { taskRow } from "@test/kit/factories/task";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("a scoped grant measures the executions of its automation", async ({
  insert,
  mcp,
  clock,
}) => {
  const { agent, project, task } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.tasks.read", unscoped: false }],
  });

  const sibling = await insert(automationRow, {
    id: "01960000-0000-7000-8000-000000000402",
    name: "Triage issues",
    agentId: agent.id,
    projectId: project.id,
  });

  const siblingTask = await insert(taskRow, {
    id: "01960000-0000-7000-8000-000000000602",
    automationId: sibling.id,
  });

  await insert(executionRow, [
    {
      id: "01960000-0000-7000-8000-000000000702",
      taskId: task.id,
      outcome: "failed",
      cost: 0.25,
      queuedAt: clock.now,
    },
    {
      id: "01960000-0000-7000-8000-000000000703",
      taskId: siblingTask.id,
      cost: 1,
      queuedAt: clock.now,
    },
  ]);

  expect(await mcp.call(executionToken, "yapir_execution_metrics")).toEqual({
    items: [
      {
        executions: 2,
        startedTasks: 1,
        succeededExecutions: 0,
        failedExecutions: 1,
        cost: 0.25,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        averageDuration: 300_000,
      },
    ],
  });
});
