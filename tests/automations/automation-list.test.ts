import { agentRow } from "@test/kit/factories/agent";
import { automationRow } from "@test/kit/factories/automation";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { expect, test } from "@test/kit/test";

test("lists the automations of the project with their agent and state, without the deleted ones", async ({
  page,
  insert,
}) => {
  const [project, otherProject] = await insert(projectRow, [
    {},
    { id: "01960000-0000-7000-8000-000000000502", name: "Other" },
  ]);

  const modelProvider = await insert(modelProviderRow);

  const [reviewer, housekeeper] = await insert(agentRow, [
    { modelProviderId: modelProvider.id },
    {
      id: "01960000-0000-7000-8000-000000000302",
      name: "Housekeeper",
      modelProviderId: modelProvider.id,
    },
  ]);

  const [review, housekeeping] = await insert(automationRow, [
    { agentId: reviewer.id, projectId: project.id },
    {
      id: "01960000-0000-7000-8000-000000000402",
      name: "Clean up the backlog",
      enabled: false,
      agentId: housekeeper.id,
      projectId: project.id,
    },
    {
      id: "01960000-0000-7000-8000-000000000403",
      name: "Triage issues",
      deletedAt: new Date("2026-09-03T09:00:00Z"),
      agentId: reviewer.id,
      projectId: project.id,
    },
    {
      id: "01960000-0000-7000-8000-000000000404",
      name: "Release notes",
      agentId: reviewer.id,
      projectId: otherProject.id,
    },
  ]);

  await page.goto(`/projects/${project.id}/automations`);

  await expect(page.getByRole("table")).toMatchAriaSnapshot(`
    - rowgroup
    - rowgroup:
      - /children: equal
      - row "${housekeeper.name} ${housekeeping.name} Disabled Start execution"
      - row "${reviewer.name} ${review.name} Enabled Start execution"
  `);
});
