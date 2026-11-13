import type { RepositorySelect } from "@server/lib/db/schema";
import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { effectRow } from "@test/kit/factories/effect";
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
import {
  pullRequestOpenedPayload,
  pullRequestSynchronizePayload,
} from "@test/kit/payloads/github/pull-request";
import { expect, test } from "@test/kit/test";

// A project of a GitHub repository, and the agent of its automations.
async function insertProject(insert: ReturnType<typeof inserter>) {
  const connection = await insert(githubConnectionRow);
  const repository = await insert(repositoryRow);
  const project = await insert(projectRow, { ciRepositoryId: repository.id });

  await insert(projectRepositoryRow, {
    projectId: project.id,
    repositoryId: repository.id,
  });

  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });

  return { connection, repository, project, agent };
}

// The fields of a delivery that name the repository and the installation of the Connection.
function deliveredFor(
  repository: RepositorySelect,
  connection: ReturnType<typeof githubConnectionRow>
) {
  const { repository: payloadRepository, installation } =
    pullRequestOpenedPayload();

  return {
    repository: {
      ...payloadRepository,
      id: Number(repository.externalId),
      full_name: repository.path,
    },
    installation: {
      ...installation!,
      id: connection.settings.installationId,
    },
  };
}

test("an opened pull request starts the automations whose trigger matches", async ({
  db,
  insert,
  clock,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  const [review] = await insert(automationRow, [
    {
      agentId: agent.id,
      projectId: project.id,
      ciRepositoryId: repository.id,
      triggers: [
        {
          type: "github.pull_request.opened",
          expression: "event.pull_request.base.ref == 'main'",
        },
      ],
    },
    {
      id: "01960000-0000-7000-8000-000000000402",
      name: "Review release branches",
      agentId: agent.id,
      projectId: project.id,
      ciRepositoryId: repository.id,
      triggers: [
        {
          type: "github.pull_request.opened",
          expression: "event.pull_request.base.ref == 'release'",
        },
      ],
    },
  ]);

  const sent = pullRequestOpenedPayload(deliveredFor(repository, connection));

  await github.send("pull_request", sent, "delivery-1");

  const [task] = await db.query.taskTable.findMany();
  const [execution] = await db.query.executionTable.findMany();

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      id: task!.id,
      automationId: review.id,
      state: "queued",
      consecutiveFailures: 0,
      activeExecutionId: execution!.id,
      createdAt: clock.now,
      stateChangedAt: clock.now,
    },
  ]);

  expect(await db.query.taskAssociationTable.findMany()).toEqual([
    {
      automationId: review.id,
      taskId: task!.id,
      integration: "github",
      host: "github.com",
      kind: "issue",
      externalId: `${repository.externalId}#${sent.number}`,
      presentation: {
        url: sent.pull_request.html_url,
        label: `#${sent.number}`,
        title: sent.pull_request.title,
      },
      createdAt: clock.now,
    },
  ]);

  expect(await db.query.taskEventTable.findMany()).toEqual([
    {
      taskId: task!.id,
      eventId: "github:github.com:delivery-1",
      notification: expect.objectContaining({
        type: "github.pull_request.opened",
      }),
      receivedAt: clock.now,
      state: "pending",
      executionId: null,
    },
  ]);

  expect(await db.query.executionTable.findMany()).toEqual([
    {
      ...executionRow({
        id: execution!.id,
        taskId: task!.id,
        outcome: null,
        leaseExpiresAt: new Date(clock.now.getTime() + 10 * 60_000),
        queuedAt: clock.now,
        startedAt: null,
        endedAt: null,
      }),
      // The hash of a secret that only the runner receives.
      claimHash: expect.any(String),
    },
  ]);
});

test("a new commit on a pull request starts its task again", async ({
  db,
  insert,
  clock,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    triggers: [{ type: "github.pull_request.synchronize", expression: "true" }],
  });

  const sent = pullRequestSynchronizePayload(
    deliveredFor(repository, connection)
  );

  const task = await insert(taskRow, { automationId: automation.id });

  const association = await insert(taskAssociationRow, {
    automationId: automation.id,
    taskId: task.id,
    externalId: `${repository.externalId}#${sent.number}`,
  });

  const finished = await insert(executionRow, { taskId: task.id });

  const opened = await insert(taskEventRow, {
    taskId: task.id,
    state: "acknowledged",
    executionId: finished.id,
  });

  await github.send("pull_request", sent, "delivery-2");

  const executions = await db.query.executionTable.findMany({
    orderBy: { queuedAt: "asc" },
  });

  expect(await db.query.taskTable.findMany()).toEqual([
    {
      ...task,
      state: "queued",
      activeExecutionId: executions[1]!.id,
      stateChangedAt: clock.now,
    },
  ]);

  expect(await db.query.taskAssociationTable.findMany()).toEqual([
    {
      ...association,
      presentation: {
        url: sent.pull_request.html_url,
        label: `#${sent.number}`,
        title: sent.pull_request.title,
      },
    },
  ]);

  expect(
    await db.query.taskEventTable.findMany({ orderBy: { receivedAt: "asc" } })
  ).toEqual([
    opened,
    {
      taskId: task.id,
      eventId: "github:github.com:delivery-2",
      notification: expect.objectContaining({
        type: "github.pull_request.synchronize",
      }),
      receivedAt: clock.now,
      state: "pending",
      executionId: null,
    },
  ]);

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
      claimHash: expect.any(String),
    },
  ]);
});

test("a redelivered event starts nothing more", async ({
  db,
  insert,
  clock,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    triggers: [{ type: "github.pull_request.opened", expression: "true" }],
  });

  const sent = pullRequestOpenedPayload(deliveredFor(repository, connection));
  await github.send("pull_request", sent, "delivery-1");

  const delivered = [
    await db.query.taskTable.findMany(),
    await db.query.taskAssociationTable.findMany(),
    await db.query.taskEventTable.findMany(),
    await db.query.executionTable.findMany(),
  ];

  await clock.skip(60_000);
  await github.send("pull_request", sent, "delivery-1");

  expect([
    await db.query.taskTable.findMany(),
    await db.query.taskAssociationTable.findMany(),
    await db.query.taskEventTable.findMany(),
    await db.query.executionTable.findMany(),
  ]).toEqual(delivered);
});

test("an event on a busy task waits in its inbox", async ({
  db,
  insert,
  clock,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    triggers: [{ type: "github.pull_request.synchronize", expression: "true" }],
  });

  const sent = pullRequestSynchronizePayload(
    deliveredFor(repository, connection)
  );

  const runningId = "01960000-0000-7000-8000-000000000702";

  const task = await insert(taskRow, {
    automationId: automation.id,
    state: "running",
    activeExecutionId: runningId,
  });

  await insert(taskAssociationRow, {
    automationId: automation.id,
    taskId: task.id,
    externalId: `${repository.externalId}#${sent.number}`,
  });

  const running = await insert(executionRow, {
    id: runningId,
    taskId: task.id,
    outcome: null,
    endedAt: null,
    leaseExpiresAt: new Date("2026-09-01T10:02:00Z"),
  });

  await github.send("pull_request", sent, "delivery-2");

  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.executionTable.findMany()).toEqual([running]);

  expect(await db.query.taskEventTable.findMany()).toEqual([
    {
      taskId: task.id,
      eventId: "github:github.com:delivery-2",
      notification: expect.objectContaining({
        type: "github.pull_request.synchronize",
      }),
      receivedAt: clock.now,
      state: "pending",
      executionId: null,
    },
  ]);
});

test("an automation does not start on the pull request that its agent opened", async ({
  db,
  insert,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    triggers: [{ type: "github.pull_request.opened", expression: "true" }],
  });

  const sent = pullRequestOpenedPayload(deliveredFor(repository, connection));
  const task = await insert(taskRow, { automationId: automation.id });
  const execution = await insert(executionRow, { taskId: task.id });

  await insert(effectRow, {
    automationId: automation.id,
    taskId: task.id,
    agentId: agent.id,
    executionId: execution.id,
    externalId: `${repository.externalId}#${sent.number}`,
  });

  await github.send("pull_request", sent, "delivery-1");

  expect(await db.query.taskTable.findMany()).toEqual([task]);
  expect(await db.query.taskAssociationTable.findMany()).toEqual([]);
  expect(await db.query.taskEventTable.findMany()).toEqual([]);
  expect(await db.query.executionTable.findMany()).toEqual([execution]);
});

test("an opened pull request that the agent associates at the same time starts no second task", async ({
  db,
  insert,
  github,
}) => {
  const { connection, repository, project, agent } =
    await insertProject(insert);

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    triggers: [{ type: "github.pull_request.opened", expression: "true" }],
  });

  const sent = pullRequestOpenedPayload(deliveredFor(repository, connection));
  const owner = await insert(taskRow, { automationId: automation.id });

  const release = await holdRowLock(db, "automation", automation.id);
  const delivery = github.send("pull_request", sent, "delivery-1");
  await waitForLockWaiters(db, 1);

  await insert(taskAssociationRow, {
    automationId: automation.id,
    taskId: owner.id,
    externalId: `${repository.externalId}#${sent.number}`,
  });

  await release();
  await delivery;

  expect(await db.query.taskTable.findMany()).toEqual([
    expect.objectContaining({ id: owner.id }),
  ]);
});
