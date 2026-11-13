import type { ExecutionSelect, TaskSelect } from "@server/lib/db/schema";
import { hashSecret } from "@server/lib/executions/execution-secret";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import type { inserter } from "@test/kit/insert";
import { expect, test } from "@test/kit/test";

const claimId = "execution-claim-id";

async function insertQueuedTask(
  insert: ReturnType<typeof inserter>,
  override: {
    task?: Partial<TaskSelect>;
    execution?: Partial<ExecutionSelect>;
  } = {}
) {
  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });
  const project = await insert(projectRow, { instructions: "Use pnpm." });

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    dispatcher: "local",
  });

  const executionId = "01960000-0000-7000-8000-000000000702";

  const task = await insert(taskRow, {
    automationId: automation.id,
    state: "queued",
    activeExecutionId: executionId,
    ...override.task,
  });

  const execution = await insert(executionRow, {
    id: executionId,
    taskId: task.id,
    outcome: null,
    dispatcher: "local",
    claimHash: hashSecret(claimId),
    leaseExpiresAt: new Date("2026-09-01T10:05:00Z"),
    startedAt: null,
    endedAt: null,
    ...override.execution,
  });

  return { agent, project, task, execution };
}

test("a runner claims its queued execution and receives the work", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const { agent, project, task, execution } = await insertQueuedTask(insert);

  const response = await request.post("/api/runner/claim", {
    data: { executionId: execution.id, claimId },
  });

  expect(await response.json()).toEqual({
    claimed: true,
    token: expect.any(String),
    taskId: task.id,
    automation: expect.objectContaining({
      harness: agent.harness,
      instructions: agent.prompt,
      skills: [],
    }),
    allowedHosts: null,
    project: { instructions: project.instructions, repositories: [] },
  });

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...execution,
      tokenHash: expect.any(String),
      startedAt: clock.now,
      leaseExpiresAt: new Date(clock.now.getTime() + 2 * 60_000),
      agentId: agent.id,
      modelProviderId: agent.modelProviderId,
      model: agent.model,
      effort: agent.effort,
      harness: agent.harness,
    },
  ]);

  expect(await db.query.taskTable.findMany()).toEqual([
    { ...task, state: "running", stateChangedAt: clock.now },
  ]);
});

test("a claim of a stopped execution answers how it ended", async ({
  request,
  db,
  insert,
}) => {
  const { task, execution } = await insertQueuedTask(insert, {
    task: { state: "stopped", activeExecutionId: null },
    execution: {
      outcome: "stopped",
      endedAt: new Date("2026-09-01T09:59:30Z"),
    },
  });

  const response = await request.post("/api/runner/claim", {
    data: { executionId: execution.id, claimId },
  });

  expect(await response.json()).toEqual({ claimed: false, outcome: "stopped" });
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});

test("refuses a claim ID that does not open the execution", async ({
  request,
  db,
  insert,
}) => {
  const { task, execution } = await insertQueuedTask(insert);

  const response = await request.post("/api/runner/claim", {
    data: { executionId: execution.id, claimId: "another-claim-id" },
  });

  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({
    title: "EXECUTION_CLAIM_INVALID",
  });
  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});
