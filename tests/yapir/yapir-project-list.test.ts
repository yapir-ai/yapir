import { projectRow } from "@test/kit/factories/project";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("an execution reads its project", async ({ insert, mcp }) => {
  const { project } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.configuration.read", unscoped: true }],
  });

  await insert(projectRow, {
    id: "01960000-0000-7000-8000-000000000502",
    name: "Other project",
  });

  expect(await mcp.call(executionToken, "yapir_project_list")).toEqual({
    items: [
      {
        id: project.id,
        deletedAt: null,
        name: "Playground",
        instructions: "",
        ciRepositoryId: null,
      },
    ],
  });
});

test("an execution reads no other project, even by ID", async ({
  insert,
  mcp,
}) => {
  await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.configuration.read", unscoped: true }],
  });

  const otherProject = await insert(projectRow, {
    id: "01960000-0000-7000-8000-000000000502",
    name: "Other project",
  });

  expect(
    await mcp.call(executionToken, "yapir_project_list", {
      id: [otherProject.id],
    })
  ).toEqual({ items: [] });
});
