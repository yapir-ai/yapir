import { expect, test } from "@test/kit/test";
import { Rogue } from "@test/kit/workflows/rogue";

test("a run() that breaks a rule of the engine fails its call and writes nothing", async ({
  db,
  probes: { engine },
}) => {
  for (const fault of ["two waits", "a foreign await"]) {
    await expect(
      engine.start(Rogue, "01960000-0000-7000-8000-000000000904", fault).poke()
    ).rejects.toThrow();
  }

  expect(await db.query.workflowTable.findMany()).toEqual([]);
});
