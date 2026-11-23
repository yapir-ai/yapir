import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { githubConnectionRow } from "@test/kit/factories/github-connection";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { projectRepositoryRow } from "@test/kit/factories/project-repository";
import { repositoryRow } from "@test/kit/factories/repository";
import { taskRow } from "@test/kit/factories/task";
import { taskAssociationRow } from "@test/kit/factories/task-association";
import { taskEventRow } from "@test/kit/factories/task-event";
import type { inserter } from "@test/kit/insert";
import { holdRowLock, waitForLockWaiters } from "@test/kit/lock";
import { expect, test } from "@test/kit/test";

async function insertTask(
  insert: ReturnType<typeof inserter>,
  automation: Partial<Parameters<typeof automationRow>[0]> = {}
) {
  await insert(githubConnectionRow);
  const repository = await insert(repositoryRow);
  const project = await insert(projectRow, { ciRepositoryId: repository.id });

  await insert(projectRepositoryRow, {
    projectId: project.id,
    repositoryId: repository.id,
  });

  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });

  const owner = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    ...automation,
  });

  const task = await insert(taskRow, { automationId: owner.id });
  await insert(taskAssociationRow, {
    automationId: owner.id,
    taskId: task.id,
  });

  const finished = await insert(executionRow, { taskId: task.id });

  const event = await insert(taskEventRow, {
    taskId: task.id,
    eventId: "yapir:manual:01960000-0000-7000-8000-000000000801",
    notification: {
      type: "yapir.manual",
      data: { message: "A Yapir user started this execution manually." },
      author: null,
    },
    state: "acknowledged",
    executionId: finished.id,
  });

  return { project, task, finished, event };
}

test("a message to an idle task queues a new execution", async ({
  page,
  db,
  insert,
  clock,
}) => {
  const { project, task, finished, event } = await insertTask(insert);

  await page.goto(`/projects/${project.id}/tasks/${task.id}`);

  await page
    .getByRole("textbox", { name: "Message" })
    .fill("Also check the changelog");

  await page.keyboard.press("ControlOrMeta+Enter");

  await expect
    .poll(async () => await db.query.taskEventTable.findMany())
    .toHaveLength(2);

  expect(await db.query.taskEventTable.findMany()).toEqual(
    expect.arrayContaining([
      event,
      {
        taskId: task.id,
        eventId: expect.stringMatching(/^yapir:message:/u),
        notification: expect.objectContaining({ type: "yapir.message" }),
        receivedAt: clock.now,
        state: "pending",
        executionId: null,
      },
    ])
  );

  const executions = await db.query.executionTable.findMany({
    orderBy: { queuedAt: "asc" },
  });

  expect(executions).toEqual([
    finished,
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
      state: "queued",
      activeExecutionId: executions[1]!.id,
      stateChangedAt: clock.now,
    },
  ]);
});

test("two messages at the same time to an idle task both queue on one execution", async ({
  page,
  db,
  insert,
}) => {
  const { task } = await insertTask(insert);

  const release = await holdRowLock(db, "task", task.id);

  const responses = ["first", "second"].map(
    async (message) =>
      await page.request.post(`/api/tasks/${task.id}/messages`, {
        data: { message },
      })
  );

  await waitForLockWaiters(db, 2);
  await release();

  expect(
    (await Promise.all(responses)).map((response) => response.status())
  ).toEqual([201, 201]);
  expect(await db.query.taskEventTable.findMany()).toHaveLength(3);
  expect(await db.query.executionTable.findMany()).toHaveLength(2);
});

test.describe("refuses a message", () => {
  const cases = [
    {
      name: "to a task of a disabled automation",
      automation: { enabled: false },
      client: "page",
      status: 409,
      title: "AUTOMATION_DISABLED",
    },
    {
      name: "from a user without write access to the project",
      automation: {},
      client: "outsider",
      status: 404,
      title: "TASK_NOT_FOUND",
    },
  ] as const;

  for (const { name, automation, client, status, title } of cases) {
    test(name, async ({ page, outsider, db, insert }) => {
      const { task, event, finished } = await insertTask(insert, automation);

      const response = await (client === "page" ? page.request : outsider).post(
        `/api/tasks/${task.id}/messages`,
        { data: { message: "Also check the changelog" } }
      );

      expect(response.status()).toBe(status);
      expect(await response.json()).toMatchObject({ title });
      expect(await db.query.taskEventTable.findMany()).toEqual([event]);
      expect(await db.query.executionTable.findMany()).toEqual([finished]);
    });
  }
});
