import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { executionRow } from "@test/kit/factories/execution";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { taskRow } from "@test/kit/factories/task";
import { taskAssociationRow } from "@test/kit/factories/task-association";
import { expect, test } from "@test/kit/test";

test("lists the tasks of the project with their automation and the cost of their executions", async ({
  page,
  insert,
}) => {
  const project = await insert(projectRow);
  const modelProvider = await insert(modelProviderRow);
  const agent = await insert(agentRow, { modelProviderId: modelProvider.id });

  const automation = await insert(automationRow, {
    agentId: agent.id,
    projectId: project.id,
  });

  const reviewed = await insert(taskRow, { automationId: automation.id });

  const triaged = await insert(taskRow, {
    id: "01960000-0000-7000-8000-000000000602",
    automationId: automation.id,
    state: "blocked",
    stateChangedAt: new Date("2026-08-31T09:00:00Z"),
  });

  await insert(taskAssociationRow, [
    { automationId: automation.id, taskId: reviewed.id },
    {
      automationId: automation.id,
      taskId: triaged.id,
      externalId: "8001#4",
      presentation: { label: "#4" },
    },
  ]);

  await insert(executionRow, [
    { taskId: reviewed.id, cost: 0.12 },
    {
      id: "01960000-0000-7000-8000-000000000702",
      taskId: reviewed.id,
      cost: 0.3,
    },
  ]);

  await page.goto(`/projects/${project.id}/tasks`);

  await expect(page.getByRole("table", { name: "Tasks" })).toMatchAriaSnapshot(`
    - rowgroup:
      - row "Automation Task State Cost Last execution"
    - rowgroup:
      - /children: equal
      - row:
        - cell "${automation.name}"
        - cell "#3"
        - cell "Idle"
        - cell "$0.42"
        - cell
      - row:
        - cell "${automation.name}"
        - cell "#4"
        - cell "Blocked"
        - cell "$0.00"
        - cell
  `);
});
