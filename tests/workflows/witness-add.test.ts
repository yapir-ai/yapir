import { expect, test } from "@test/kit/test";
import { Witness } from "@test/kit/workflows/witness";

test("a local of run() keeps what a field held when run() waited", async ({
  db,
  probes: { engine, clock },
}) => {
  const id = "01960000-0000-7000-8000-000000000903";

  await engine.start(Witness, id).add("first");

  expect(await db.query.workflowTable.findMany()).toEqual([
    {
      id,
      type: "witness",
      rootId: id,
      parentId: null,
      fields: { items: { value: ["first"] } },
      journal: [],
      result: { held: 0 },
      wakeAt: null,
      createdAt: clock.now,
    },
  ]);
});
