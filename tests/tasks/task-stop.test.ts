import type { ExecutionSelect, TaskSelect } from "@server/lib/db/schema";
import { hashSecret } from "@server/lib/executions/execution-secret";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { taskAssociationRow } from "@test/kit/factories/task-association";
import { taskEventRow } from "@test/kit/factories/task-event";
import { userRow } from "@test/kit/factories/user";
import type { inserter } from "@test/kit/insert";
import { holdRowLock, waitForLockWaiters } from "@test/kit/lock";
import { expect, test } from "@test/kit/test";

async function insertTask(
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
    consecutiveFailures: 1,
    ...override.task,
  });

  await insert(taskAssociationRow, {
    automationId: automation.id,
    taskId: task.id,
  });

  const execution = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    tokenHash: hashSecret("execution-token"),
    leaseExpiresAt: new Date("2026-09-01T10:01:00Z"),
    startedAt: new Date("2026-09-01T09:59:00Z"),
    endedAt: null,
    ...override.execution,
  });

  return { project, task, execution };
}

const manualRun = {
  type: "yapir.manual",
  data: { message: "A Yapir user started this execution manually." },
  author: null,
};

test("stopping a task ends its execution and keeps its unfinished events for the next one", async ({
  page,
  db,
  insert,
  clock,
}) => {
  const { project, task, execution } = await insertTask(insert);

  const unread = await insert(taskEventRow, {
    taskId: task.id,
    eventId: "yapir:manual:01960000-0000-7000-8000-000000000801",
    notification: manualRun,
    state: "delivered",
    executionId: execution.id,
  });

  const pending = await insert(taskEventRow, {
    taskId: task.id,
    eventId: "yapir:manual:01960000-0000-7000-8000-000000000802",
    notification: manualRun,
    receivedAt: new Date("2026-09-01T09:59:30Z"),
  });

  await page.goto(`/projects/${project.id}/tasks/${task.id}`);
  await page.getByRole("button", { name: "Stop execution" }).click();

  await expect
    .poll(async () => await db.query.taskTable.findMany())
    .toEqual([
      {
        ...task,
        state: "stopped",
        activeExecutionId: null,
        stateChangedAt: clock.now,
      },
    ]);

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...execution,
      outcome: "stopped",
      stoppedById: userRow().id,
      endedAt: clock.now,
    },
  ]);

  expect(
    await db.query.taskEventTable.findMany({ orderBy: { receivedAt: "asc" } })
  ).toEqual([{ ...unread, state: "pending", executionId: null }, pending]);
});

test("stopping a task without an active execution changes nothing", async ({
  page,
  db,
  insert,
}) => {
  const { task, execution } = await insertTask(insert, {
    task: { state: "idle", activeExecutionId: null },
    execution: {
      outcome: "succeeded",
      endedAt: new Date("2026-09-01T09:59:30Z"),
    },
  });

  const response = await page.request.post(`/api/tasks/${task.id}/stop`);

  expect(response.status()).toBe(204);
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});

test("a stop that waits for a failure that retries stops the retry", async ({
  page,
  request,
  db,
  insert,
}) => {
  const { task, execution } = await insertTask(insert);

  await insert(taskEventRow, {
    taskId: task.id,
    eventId: "yapir:manual:01960000-0000-7000-8000-000000000801",
    notification: manualRun,
    state: "delivered",
    executionId: execution.id,
  });

  const release = await holdRowLock(db, "task", task.id);

  const fail = request.post("/api/runner/fail", {
    headers: { authorization: "Bearer execution-token" },
    data: { error: "boom" },
  });

  await waitForLockWaiters(db, 1);
  const stop = page.request.post(`/api/tasks/${task.id}/stop`);
  await waitForLockWaiters(db, 2);
  await release();

  expect((await fail).status()).toBe(200);
  expect((await stop).status()).toBe(204);

  expect(await db.query.taskTable.findMany()).toEqual([
    expect.objectContaining({ state: "stopped", activeExecutionId: null }),
  ]);
});

test("refuses a user without write access to the project", async ({
  outsider,
  db,
  insert,
}) => {
  const { task, execution } = await insertTask(insert);

  const response = await outsider.post(`/api/tasks/${task.id}/stop`);

  expect(response.status()).toBe(404);
  expect(await response.json()).toMatchObject({ title: "TASK_NOT_FOUND" });
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});
