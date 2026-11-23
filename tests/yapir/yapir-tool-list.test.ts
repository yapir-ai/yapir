import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

const taskTools = [
  "yapir_task_list",
  "yapir_event_list",
  "yapir_execution_list",
  "yapir_execution_metrics",
  "yapir_effect_metrics",
];

const configurationTools = [
  "yapir_automation_list",
  "yapir_agent_list",
  "yapir_skill_list",
  "yapir_project_list",
  "yapir_event_catalog_list",
  "yapir_capability_list",
];

for (const { grants, tools } of [
  { grants: [], tools: [] },
  { grants: ["yapir.tasks.read"], tools: taskTools },
  { grants: ["yapir.configuration.read"], tools: configurationTools },
]) {
  test(`an execution with the grants [${grants.join(", ")}] has only their Yapir tools`, async ({
    insert,
    mcp,
  }) => {
    await insertRunningExecution(insert, {
      capabilities: grants.map((name) => ({ name, unscoped: false })),
    });

    expect(await mcp.tools(executionToken)).toEqual(tools);
  });
}
