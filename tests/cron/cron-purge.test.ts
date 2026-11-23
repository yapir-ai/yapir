import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { workflowRow } from "@test/kit/factories/workflow";
import { taskWorkflow } from "@test/kit/lifecycle";
import { expect, test } from "@test/kit/test";

test("the daily purge deletes a task that rested for 30 days, with its workflow", async ({
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

  const [old, recent] = await insert(taskRow, [
    {
      automationId: automation.id,
      stateChangedAt: new Date("2026-08-02T23:59:00Z"),
    },
    {
      id: "01960000-0000-7000-8000-000000000602",
      automationId: automation.id,
      stateChangedAt: new Date("2026-08-03T00:01:00Z"),
    },
  ]);

  const [, kept] = await insert(workflowRow, [
    taskWorkflow(old, automation),
    taskWorkflow(recent, automation),
  ]);

  await clock.set(new Date("2026-09-02T00:00:00Z"));
  await clock.tick();

  expect(await db.query.taskTable.findMany()).toEqual([recent]);
  expect(await db.query.workflowTable.findMany()).toEqual([kept]);
});
