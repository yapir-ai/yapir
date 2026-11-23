import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("an execution lists the capabilities of the registry that holds its own", async ({
  insert,
  mcp,
}) => {
  await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.configuration.read", unscoped: false }],
  });

  expect(await mcp.call(executionToken, "yapir_capability_list")).toEqual([
    {
      name: "yapir.tasks.read",
      description:
        "List the tasks, their events and executions, and their metrics",
      scopable: true,
      provider: { id: "yapir", label: "Yapir" },
      resource: { id: "tasks", label: "Tasks" },
      label: "Read tasks",
    },
    {
      name: "yapir.configuration.read",
      description:
        "List the automations, agents, skills, projects, event types and capabilities",
      scopable: true,
      provider: { id: "yapir", label: "Yapir" },
      resource: { id: "configuration", label: "Configuration" },
      label: "Read configuration",
    },
  ]);
});
