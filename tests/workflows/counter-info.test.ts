import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";

test("a counter answers after its run() returned", async ({
  request,
  insert,
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

  const response = await request.get(`/api/probes/counters/${counter.id}`);

  expect(await response.json()).toEqual({
    count: 1,
    rounds: 2,
    notes: ["echoed 1"],
  });
});
