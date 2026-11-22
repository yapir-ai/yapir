import { automationRow } from "@test/kit/factories/automation";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import type { inserter } from "@test/kit/insert";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

async function insertTasks(
  insert: ReturnType<typeof inserter>,
  unscoped: boolean
) {
  const { agent, project, task } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.tasks.read", unscoped }],
  });

  const otherProject = await insert(projectRow, {
    id: "01960000-0000-7000-8000-000000000502",
    name: "Other project",
  });

  const [sibling, foreign] = await insert(automationRow, [
    {
      id: "01960000-0000-7000-8000-000000000402",
      name: "Triage issues",
      agentId: agent.id,
      projectId: project.id,
    },
    {
      id: "01960000-0000-7000-8000-000000000403",
      name: "Fix builds",
      agentId: agent.id,
      projectId: otherProject.id,
    },
  ]);

  const siblingTask = await insert(taskRow, {
    id: "01960000-0000-7000-8000-000000000602",
    automationId: sibling.id,
    state: "blocked",
    stateChangedAt: new Date("2026-08-31T08:00:00Z"),
  });

  await insert(taskRow, {
    id: "01960000-0000-7000-8000-000000000603",
    automationId: foreign.id,
    stateChangedAt: new Date("2026-08-31T07:00:00Z"),
  });

  return { sibling, task, siblingTask };
}

test("an unscoped grant reads the tasks of every automation of the project", async ({
  insert,
  mcp,
}) => {
  const { task, siblingTask } = await insertTasks(insert, true);

  expect(await mcp.call(executionToken, "yapir_task_list")).toEqual({
    items: [
      {
        id: task.id,
        automationId: task.automationId,
        state: "running",
        consecutiveFailures: 0,
        createdAt: task.createdAt.toISOString(),
        stateChangedAt: task.stateChangedAt.toISOString(),
        cost: 0,
        associations: [],
      },
      {
        id: siblingTask.id,
        automationId: siblingTask.automationId,
        state: "blocked",
        consecutiveFailures: 0,
        createdAt: siblingTask.createdAt.toISOString(),
        stateChangedAt: siblingTask.stateChangedAt.toISOString(),
        cost: 0,
        associations: [],
      },
    ],
  });
});

test("a scoped grant reads the tasks of its automation", async ({
  insert,
  mcp,
}) => {
  const { task } = await insertTasks(insert, false);

  expect(await mcp.call(executionToken, "yapir_task_list")).toEqual({
    items: [
      {
        id: task.id,
        automationId: task.automationId,
        state: "running",
        consecutiveFailures: 0,
        createdAt: task.createdAt.toISOString(),
        stateChangedAt: task.stateChangedAt.toISOString(),
        cost: 0,
        associations: [],
      },
    ],
  });
});

test("a scoped grant reads no task of another automation, even when it asks for it", async ({
  insert,
  mcp,
}) => {
  const { sibling } = await insertTasks(insert, false);

  expect(
    await mcp.call(executionToken, "yapir_task_list", {
      automationId: [sibling.id],
    })
  ).toEqual({ items: [] });
});
