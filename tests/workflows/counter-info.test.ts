import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { Counter } from "@test/kit/workflows/counter";

test("a counter answers after its run() returned", async ({
  insert,
  probes: { engine },
}) => {
  const counter = await insert(workflowRow, {
    fields: {
      count: { value: 1 },
      rounds: { value: 2 },
      expiresAt: { value: 0 },
      notes: { value: ["echoed 1"] },
      helper: {},
    },
    result: { rounds: 2 },
  });

  expect(await engine.get(Counter, counter.id).report()).toEqual({
    count: 1,
    rounds: 2,
    notes: ["echoed 1"],
  });
});
