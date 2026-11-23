import type { ExecutionSelect, TaskSelect } from "@server/lib/db/schema";
import { hashSecret } from "@server/lib/executions/execution-secret";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { taskEventRow } from "@test/kit/factories/task-event";
import { workflowRow } from "@test/kit/factories/workflow";
import type { inserter } from "@test/kit/insert";
import { executionWorkflow, taskWorkflow } from "@test/kit/lifecycle";
import { expect, test } from "@test/kit/test";

const token = "execution-token";

async function insertClaimedTask(
  insert: ReturnType<typeof inserter>,
  override: {
    task?: Partial<TaskSelect>;
    execution?: Partial<ExecutionSelect>;
  } = {}
) {
  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });
  const project = await insert(projectRow);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
  });

  const executionId = "01960000-0000-7000-8000-000000000702";

  const task = await insert(taskRow, {
    automationId: automation.id,
    state: "running",
    activeExecutionId: executionId,
    ...override.task,
  });

  const execution = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    tokenHash: hashSecret(token),
    leaseExpiresAt: new Date("2026-09-01T10:01:00Z"),
    startedAt: new Date("2026-09-01T09:59:00Z"),
    endedAt: null,
    ...override.execution,
  });

  return { automation, task, execution };
}

test("a pull delivers the pending events into the current turn", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const { automation, task, execution } = await insertClaimedTask(insert);

  const pending = await insert(taskEventRow, {
    taskId: task.id,
    receivedAt: new Date("2026-09-01T09:59:30Z"),
  });

  await insert(workflowRow, [
    taskWorkflow(task, automation),
    executionWorkflow(execution, [pending]),
  ]);

  const response = await request.post("/api/runner/pull", {
    headers: { authorization: `Bearer ${token}` },
    data: {},
  });

  expect(await response.json()).toEqual({
    attempt: "running",
    events: [pending.notification],
  });

  expect(await db.query.taskEventTable.findMany()).toEqual([
    { ...pending, state: "delivered", executionId: execution.id },
  ]);

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...execution,
      leaseExpiresAt: new Date(clock.now.getTime() + 2 * 60_000),
    },
  ]);

  expect(await db.query.taskTable.findMany()).toEqual([task]);
});

test("a pull after the end of the execution answers how it ended", async ({
  request,
  db,
  insert,
}) => {
  const { automation, task, execution } = await insertClaimedTask(insert, {
    task: { state: "stopped", activeExecutionId: null },
    execution: {
      outcome: "stopped",
      endedAt: new Date("2026-09-01T09:59:30Z"),
    },
  });

  await insert(workflowRow, taskWorkflow(task, automation));

  const response = await request.post("/api/runner/pull", {
    headers: { authorization: `Bearer ${token}` },
    data: {},
  });

  expect(await response.json()).toEqual({ attempt: "stopped" });
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});
