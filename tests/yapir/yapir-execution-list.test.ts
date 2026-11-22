import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { taskRow } from "@test/kit/factories/task";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("a scoped grant reads the executions in progress of its automation", async ({
  insert,
  mcp,
}) => {
  const { agent, project, task, execution } = await insertRunningExecution(
    insert,
    { capabilities: [{ name: "yapir.tasks.read", unscoped: false }] }
  );

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
    { id: "01960000-0000-7000-8000-000000000702", taskId: task.id },
    {
      id: "01960000-0000-7000-8000-000000000703",
      taskId: siblingTask.id,
      outcome: null,
      endedAt: null,
    },
  ]);

  expect(
    await mcp.call(executionToken, "yapir_execution_list", { active: true })
  ).toEqual({
    items: [
      {
        id: execution.id,
        taskId: task.id,
        agentId: null,
        outcome: null,
        queuedAt: execution.queuedAt.toISOString(),
        startedAt: execution.startedAt!.toISOString(),
        endedAt: null,
        stoppedById: null,
        error: null,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          cost: 0,
        },
      },
    ],
  });
});
