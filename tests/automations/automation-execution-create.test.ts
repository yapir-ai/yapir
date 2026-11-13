import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { githubConnectionRow } from "@test/kit/factories/github-connection";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { projectRepositoryRow } from "@test/kit/factories/project-repository";
import { repositoryRow } from "@test/kit/factories/repository";
import type { inserter } from "@test/kit/insert";
import { expect, test } from "@test/kit/test";

async function insertProject(insert: ReturnType<typeof inserter>) {
  await insert(githubConnectionRow);
  const repository = await insert(repositoryRow);
  const project = await insert(projectRow, { ciRepositoryId: repository.id });

  await insert(projectRepositoryRow, {
    projectId: project.id,
    repositoryId: repository.id,
  });

  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });

  return { repository, project, agent };
}

test("starting an execution of a disabled automation queues it in a new task", async ({
  page,
  db,
  insert,
  clock,
}) => {
  const { repository, project, agent } = await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    enabled: false,
  });

  await page.goto(`/projects/${project.id}/automations/${automation.id}`);
  await page.getByRole("button", { name: "Start execution" }).click();
  await page.getByLabel("Message").fill("Check the release notes");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/[\da-f-]{36}$/u);

  const taskId = new URL(page.url()).pathname.split("/").at(-1)!;
  const [execution] = await db.query.executionTable.findMany();

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      id: taskId,
      automationId: automation.id,
      state: "queued",
      consecutiveFailures: 0,
      activeExecutionId: execution!.id,
      createdAt: clock.now,
      stateChangedAt: clock.now,
    },
  ]);

  expect(await db.query.taskEventTable.findMany()).toEqual([
    {
      taskId,
      eventId: expect.stringMatching(/^yapir:manual:/u),
      notification: expect.objectContaining({ type: "yapir.manual" }),
      receivedAt: clock.now,
      state: "pending",
      executionId: null,
    },
  ]);

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...executionRow({
        id: execution!.id,
        taskId,
        outcome: null,
        leaseExpiresAt: new Date(clock.now.getTime() + 10 * 60_000),
        queuedAt: clock.now,
        startedAt: null,
        endedAt: null,
      }),
      claimHash: expect.any(String),
    },
  ]);
});

test("refuses a user without write access to the project", async ({
  outsider,
  db,
  insert,
}) => {
  const { project, agent } = await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
  });

  const response = await outsider.post(
    `/api/automations/${automation.id}/executions`,
    { data: {} }
  );

  expect(response.status()).toBe(404);
  expect(await response.json()).toMatchObject({
    title: "AUTOMATION_NOT_FOUND",
  });
  expect(await db.query.taskTable.findMany()).toEqual([]);
});
