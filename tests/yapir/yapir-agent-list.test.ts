import { agentRow } from "@test/kit/factories/agent";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("a scoped grant reads the agent of its automation", async ({
  insert,
  mcp,
}) => {
  const { modelProvider, agent } = await insertRunningExecution(insert, {
    capabilities: [{ name: "yapir.configuration.read", unscoped: false }],
  });

  await insert(agentRow, {
    id: "01960000-0000-7000-8000-000000000302",
    name: "Implementer",
    modelProviderId: modelProvider.id,
  });

  expect(await mcp.call(executionToken, "yapir_agent_list")).toEqual({
    items: [
      {
        id: agent.id,
        deletedAt: null,
        name: "Reviewer",
        description: null,
        modelProviderId: modelProvider.id,
        model: "deepseek-v4.1-flash",
        effort: null,
        harness: "opencode",
        prompt: "Review the pull request.",
        triggers: [],
        capabilities: [],
        skillIds: [],
      },
    ],
  });
});
