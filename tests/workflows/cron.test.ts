import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { probeCallTable } from "@test/kit/workflows/probe-tables";

test("a counter expires at the first tick after its deadline", async ({
  db,
  insert,
  probes: { engine, clock, activities },
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now },
    notes: { value: [] },
    helper: {},
  };

  const counter = await insert(workflowRow, {
    fields: waiting,
    journal: [{ kind: "run", args: [2], fields: waiting, at: now - 60_000 }],
    wakeAt: clock.now,
  });

  await insert(probeRow, { id: counter.id });

  await engine.sweep();

  expect(await db.query.workflowTable.findMany()).toEqual([counter]);

  clock.now = new Date(now + 1);
  await engine.sweep();
  await Promise.all(activities);

  expect(await db.query.workflowTable.findMany()).toEqual([
    { ...counter, journal: [], result: { rounds: 0 }, wakeAt: null },
  ]);

  expect(await db.select().from(probeCallTable)).toEqual([
    { workflowId: counter.id, text: "expired" },
  ]);
});
