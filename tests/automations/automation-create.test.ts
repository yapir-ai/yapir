import { agentRow } from "@test/kit/factories/agent";
import { githubConnectionRow } from "@test/kit/factories/github-connection";
import { modelProviderRow } from "@test/kit/factories/model-provider";
import { projectRow } from "@test/kit/factories/project";
import { projectRepositoryRow } from "@test/kit/factories/project-repository";
import { repositoryRow } from "@test/kit/factories/repository";
import { expect, test } from "@test/kit/test";

test("creates a disabled automation that runs in the GitHub Actions of the project's CI repository", async ({
  page,
  db,
  insert,
}) => {
  await insert(githubConnectionRow);
  const repository = await insert(repositoryRow);
  const project = await insert(projectRow, { ciRepositoryId: repository.id });

  await insert(projectRepositoryRow, {
    projectId: project.id,
    repositoryId: repository.id,
  });

  const modelProvider = await insert(modelProviderRow);

  const reviewer = await insert(agentRow, {
    modelProviderId: modelProvider.id,
  });

  const name = "Review pull requests";

  await page.goto(`/projects/${project.id}/automations/create`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Agent").click();
  await page.getByRole("option", { name: reviewer.name }).click();
  await page.getByRole("button", { name: "Create automation" }).click();
  await expect(page).toHaveURL(/\/automations\/[\da-f-]{36}$/u);

  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(await db.query.automationTable.findFirst({ where: { id } })).toEqual({
    id,
    name,
    enabled: false,
    agentId: reviewer.id,
    projectId: project.id,
    ciRepositoryId: repository.id,
    instructions: "",
    triggers: [],
    capabilities: [],
    dispatcher: "github-actions",
    deletedAt: null,
  });
});
