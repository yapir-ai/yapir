import { hashSecret } from "@server/lib/executions/execution-secret";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { taskEventRow } from "@test/kit/factories/task-event";
import { workflowRow } from "@test/kit/factories/workflow";
import { executionWorkflow, taskWorkflow } from "@test/kit/lifecycle";
import { holdRowLock, waitForLockWaiters } from "@test/kit/lock";
import { expect, test } from "@test/kit/test";

test("an execution that no runner claimed in time fails, and the task retries its events", async ({
  db,
  insert,
  clock,
}) => {
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
    state: "queued",
    activeExecutionId: executionId,
  });

  const unclaimed = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    leaseExpiresAt: new Date(clock.now.getTime() - 1000),
    queuedAt: new Date(clock.now.getTime() - 10 * 60_000 - 1000),
    startedAt: null,
    endedAt: null,
  });

  const pending = await insert(taskEventRow, { taskId: task.id });

  await insert(workflowRow, [
    taskWorkflow(task, automation),
    executionWorkflow(unclaimed, [pending]),
  ]);

  await clock.tick();

  const executions = await db.query.executionTable.findMany({
    orderBy: { queuedAt: "asc" },
  });

  expect(executions).toEqual([
    {
      ...unclaimed,
      outcome: "failed",
      error: "No runner claimed the execution within 10 minutes",
      endedAt: clock.now,
    },
    {
      ...executionRow({
        id: executions[1]!.id,
        taskId: task.id,
        outcome: null,
        leaseExpiresAt: new Date(clock.now.getTime() + 10 * 60_000),
        queuedAt: clock.now,
        startedAt: null,
        endedAt: null,
      }),
    },
  ]);

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      ...task,
      activeExecutionId: executions[1]!.id,
      consecutiveFailures: 1,
    },
  ]);

  expect(await db.query.taskEventTable.findMany()).toEqual([pending]);
});

test("an expiry that waits for a pull leaves the execution that the pull renewed", async ({
  request,
  db,
  insert,
  clock,
}) => {
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
  });

  const running = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    tokenHash: hashSecret("execution-token"),
    leaseExpiresAt: new Date(clock.now.getTime() - 1000),
    startedAt: new Date(clock.now.getTime() - 60_000),
    endedAt: null,
  });

  await insert(workflowRow, [
    taskWorkflow(task, automation),
    executionWorkflow(running),
  ]);

  const release = await holdRowLock(db, "workflow", task.id);

  const pull = request.post("/api/runner/pull", {
    headers: { authorization: "Bearer execution-token" },
    data: {},
  });

  await waitForLockWaiters(db, 1);
  const tick = clock.tick();
  await waitForLockWaiters(db, 2);
  await release();

  expect(await (await pull).json()).toEqual({ attempt: "running", events: [] });
  await tick;

  expect(await db.query.executionTable.findMany()).toEqual([
    { ...running, leaseExpiresAt: new Date(clock.now.getTime() + 2 * 60_000) },
  ]);
});
