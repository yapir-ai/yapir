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

test("a failure gives the turn's events back to the task, which retries them", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const { task, execution } = await insertClaimedTask(insert);

  const unread = await insert(taskEventRow, {
    taskId: task.id,
    state: "delivered",
    executionId: execution.id,
  });

  const response = await request.post("/api/runner/fail", {
    headers: { authorization: `Bearer ${token}` },
    data: { error: "The harness crashed" },
  });

  expect(await response.json()).toEqual({ attempt: "failed" });
  expect(await db.query.taskEventTable.findMany()).toEqual([
    { ...unread, state: "pending", executionId: null },
  ]);

  const executions = await db.query.executionTable.findMany({
    orderBy: { queuedAt: "asc" },
  });

  expect(executions).toEqual([
    {
      ...execution,
      outcome: "failed",
      error: "The harness crashed",
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
      claimHash: expect.any(String),
    },
  ]);

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      ...task,
      state: "queued",
      activeExecutionId: executions[1]!.id,
      consecutiveFailures: 1,
      stateChangedAt: clock.now,
    },
  ]);
});

test.describe("a failure rests the task", () => {
  const cases = [
    {
      name: "blocked after its third failure in a row",
      consecutiveFailures: 2,
      event: "delivered" as const,
      returned: { state: "pending" as const, executionId: null },
      state: "blocked" as const,
    },
    {
      name: "idle when no event waits",
      consecutiveFailures: 0,
      event: "acknowledged" as const,
      returned: {},
      state: "idle" as const,
    },
  ];

  for (const { name, consecutiveFailures, event, returned, state } of cases) {
    test(name, async ({ request, db, insert, clock }) => {
      const { task, execution } = await insertClaimedTask(insert, {
        task: { consecutiveFailures },
      });

      const received = await insert(taskEventRow, {
        taskId: task.id,
        state: event,
        executionId: execution.id,
      });

      await request.post("/api/runner/fail", {
        headers: { authorization: `Bearer ${token}` },
        data: { error: "The harness crashed" },
      });

      expect(await db.query.taskEventTable.findMany()).toEqual([
        { ...received, ...returned },
      ]);

      expect(await db.query.executionTable.findMany()).toEqual([
        {
          ...execution,
          outcome: "failed",
          error: "The harness crashed",
          endedAt: clock.now,
        },
      ]);

      expect(await db.query.taskTable.findMany()).toEqual([
        {
          ...task,
          state,
          activeExecutionId: null,
          consecutiveFailures: consecutiveFailures + 1,
          stateChangedAt: clock.now,
        },
      ]);
    });
  }
});

test("a failure reported after the end of the execution answers how it ended", async ({
  request,
  db,
  insert,
}) => {
  const { task, execution } = await insertClaimedTask(insert, {
    task: { state: "stopped", activeExecutionId: null },
    execution: {
      outcome: "stopped",
      endedAt: new Date("2026-09-01T09:59:30Z"),
    },
  });

  const response = await request.post("/api/runner/fail", {
    headers: { authorization: `Bearer ${token}` },
    data: { error: "The model proxy refused the request" },
  });

  expect(await response.json()).toEqual({ attempt: "stopped" });
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});
