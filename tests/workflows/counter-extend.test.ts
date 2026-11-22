import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { holdRowLock, waitForLockWaiters } from "@test/kit/lock";
import { expect, test } from "@test/kit/test";
import { probeCallTable } from "@test/kit/workflows/probe-tables";

test("a counter whose deadline moves before the tick takes the lock keeps waiting", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now - 1000 },
    notes: { value: [] },
    helper: {},
  };

  const counter = await insert(workflowRow, {
    fields: waiting,
    journal: [{ kind: "run", args: [2], fields: waiting, at: now - 61_000 }],
    wakeAt: new Date(now - 1000),
  });

  await insert(probeRow, { id: counter.id });

  const release = await holdRowLock(db, "workflow", counter.id);

  const extend = request.post(`/api/probes/counters/${counter.id}/extend`, {
    data: { duration: 120_000 },
  });

  await waitForLockWaiters(db, 1);
  const tick = clock.tick();
  await waitForLockWaiters(db, 2);
  await release();

  expect((await extend).status()).toBe(204);
  await tick;

  expect(await db.query.workflowTable.findMany()).toEqual([
    {
      ...counter,
      fields: { ...waiting, expiresAt: { value: now + 120_000 } },
      wakeAt: new Date(now + 120_000),
    },
  ]);

  expect(await db.select().from(probeCallTable)).toEqual([]);
});
