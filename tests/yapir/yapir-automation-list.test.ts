import { automationRow } from "@test/kit/factories/automation";
import { projectRow } from "@test/kit/factories/project";
import type { inserter } from "@test/kit/insert";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

async function insertAutomations(
  insert: ReturnType<typeof inserter>,
  unscoped: boolean
) {
  const { agent, project, automation } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.configuration.read", unscoped }],
  });

  const otherProject = await insert(projectRow, {
    id: "01960000-0000-7000-8000-000000000502",
    name: "Other project",
  });

  const [sibling] = await insert(automationRow, [
    {
      id: "01960000-0000-7000-8000-000000000402",
      name: "Triage issues",
      agentId: agent.id,
      projectId: project.id,
      instructions: "Label each new issue.",
    },
    {
      id: "01960000-0000-7000-8000-000000000403",
      name: "Fix builds",
      agentId: agent.id,
      projectId: otherProject.id,
    },
  ]);

  return { automation, sibling };
}

test("an unscoped grant reads the automations of the project", async ({
  insert,
  mcp,
}) => {
  const { automation, sibling } = await insertAutomations(insert, true);

  expect(await mcp.call(executionToken, "yapir_automation_list")).toEqual({
    items: [
      {
        id: sibling.id,
        deletedAt: null,
        name: "Triage issues",
        enabled: true,
        agentId: sibling.agentId,
        projectId: sibling.projectId,
        ciRepositoryId: null,
        instructions: "Label each new issue.",
        triggers: [],
        capabilities: [],
        dispatcher: "github-actions",
      },
      {
        id: automation.id,
        deletedAt: null,
        name: automation.name,
        enabled: true,
        agentId: automation.agentId,
        projectId: automation.projectId,
        ciRepositoryId: null,
        instructions: "",
        triggers: [],
        capabilities: [{ name: "yapir.configuration.read", unscoped: true }],
        dispatcher: "github-actions",
      },
    ],
  });
});

test("a scoped grant reads its automation", async ({ insert, mcp }) => {
  const { automation } = await insertAutomations(insert, false);

  expect(await mcp.call(executionToken, "yapir_automation_list")).toEqual({
    items: [
      {
        id: automation.id,
        deletedAt: null,
        name: automation.name,
        enabled: true,
        agentId: automation.agentId,
        projectId: automation.projectId,
        ciRepositoryId: null,
        instructions: "",
        triggers: [],
        capabilities: [{ name: "yapir.configuration.read", unscoped: false }],
        dispatcher: "github-actions",
      },
    ],
  });
});
