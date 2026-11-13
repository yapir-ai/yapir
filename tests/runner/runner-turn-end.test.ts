import type { ExecutionSelect, TaskSelect } from "@server/lib/db/schema";
import { hashSecret } from "@server/lib/executions/execution-secret";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { taskEventRow } from "@test/kit/factories/task-event";
import type { inserter } from "@test/kit/insert";
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

  return { task, execution };
}

test("a turn end acknowledges the turn's events and starts the next turn with the pending ones", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const { task, execution } = await insertClaimedTask(insert);

  const read = await insert(taskEventRow, {
    taskId: task.id,
    state: "delivered",
    executionId: execution.id,
  });

  const pending = await insert(taskEventRow, {
    taskId: task.id,
    eventId: "github:github.com:delivery-1",
    receivedAt: new Date("2026-09-01T09:59:30Z"),
  });

  const response = await request.post("/api/runner/turn-end", {
    headers: { authorization: `Bearer ${token}` },
    data: {},
  });

  expect(await response.json()).toEqual({
    attempt: "running",
    events: [pending.notification],
  });

  expect(
    await db.query.taskEventTable.findMany({ orderBy: { receivedAt: "asc" } })
  ).toEqual([
    { ...read, state: "acknowledged" },
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

test("a turn end without pending events ends the execution and rests the task", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const { task, execution } = await insertClaimedTask(insert, {
    task: { consecutiveFailures: 2 },
  });

  const read = await insert(taskEventRow, {
    taskId: task.id,
    state: "delivered",
    executionId: execution.id,
  });

  const response = await request.post("/api/runner/turn-end", {
    headers: { authorization: `Bearer ${token}` },
    data: {},
  });

  expect(await response.json()).toEqual({ attempt: "succeeded" });

  expect(await db.query.taskEventTable.findMany()).toEqual([
    { ...read, state: "acknowledged" },
  ]);

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...execution,
      outcome: "succeeded",
      leaseExpiresAt: new Date(clock.now.getTime() + 2 * 60_000),
      endedAt: clock.now,
    },
  ]);

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      ...task,
      state: "idle",
      activeExecutionId: null,
      consecutiveFailures: 0,
      stateChangedAt: clock.now,
    },
  ]);
});
