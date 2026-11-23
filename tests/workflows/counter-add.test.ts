import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { holdRowLock, waitForLockWaiters } from "@test/kit/lock";
import { expect, test } from "@test/kit/test";
import { probeCallTable, probeTable } from "@test/kit/workflows/probe-tables";

const counterId = "01960000-0000-7000-8000-000000000901";

test("the first call starts the counter, and each call replays it", async ({
  request,
  db,
  clock,
}) => {
  const first = await request.post(`/api/probes/counters/${counterId}/add`, {
    data: { amount: 1, goal: 3 },
  });

  expect(await first.json()).toEqual({ count: 1 });

  const second = await request.post(`/api/probes/counters/${counterId}/add`, {
    data: { amount: 1, goal: 3 },
  });

  expect(await second.json()).toEqual({ count: 2 });

  const now = clock.now.getTime();

  expect(await db.query.workflowTable.findMany()).toEqual([
    {
      id: counterId,
      type: "counter",
      rootId: counterId,
      parentId: null,
      fields: {
        count: { value: 2 },
        rounds: { value: 0 },
        expiresAt: { value: now + 60_000 },
        notes: { value: [] },
        helper: {},
      },
      journal: [
        {
          kind: "run",
          args: [3],
          fields: {
            count: { value: 0 },
            rounds: { value: 0 },
            expiresAt: { value: now + 60_000 },
            notes: { value: [] },
            helper: {},
          },
          at: now,
        },
      ],
      result: null,
      wakeAt: new Date(now + 60_000),
      createdAt: clock.now,
    },
  ]);

  expect(await db.select().from(probeTable)).toEqual([
    { id: counterId, count: 2, rounds: 0, echoed: null },
  ]);
});

test("a counter that reaches its goal starts a helper, which echoes the greeting of the counter in the same call", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now + 60_000 },
    notes: { value: [] },
    helper: {},
  };

  await insert(workflowRow, {
    fields: { ...waiting, count: { value: 1 } },
    journal: [{ kind: "run", args: [2], fields: waiting, at: now - 1000 }],
    wakeAt: new Date(now + 60_000),
  });

  await insert(probeRow, { id: counterId, count: 1 });

  const response = await request.post(`/api/probes/counters/${counterId}/add`, {
    data: { amount: 1 },
  });

  expect(await response.json()).toEqual({ count: 2 });

  const [counter, helper] = await db.query.workflowTable.findMany({
    orderBy: { type: "asc" },
  });

  expect([counter, helper]).toEqual([
    workflowRow({
      fields: {
        ...waiting,
        count: { value: 2 },
        notes: { value: ["round 0 started", "welcome"] },
        helper: { child: helper!.id },
      },
      journal: [
        { kind: "run", args: [2], fields: waiting, at: now - 1000 },
        {
          kind: "resolve",
          command: 0,
          of: "until",
          outcome: true,
          fields: { ...waiting, count: { value: 2 } },
          at: now,
        },
        { kind: "start", command: 1, child: helper!.id },
      ],
    }),
    {
      id: helper!.id,
      type: "helper",
      rootId: counterId,
      parentId: counterId,
      fields: {
        inbox: { value: [] },
        echoed: { value: 1 },
        done: { value: false },
      },
      journal: [
        {
          kind: "run",
          args: ["round 0"],
          fields: {
            inbox: { value: [] },
            echoed: { value: 0 },
            done: { value: false },
          },
          at: now,
        },
        {
          kind: "resolve",
          command: 0,
          of: "until",
          outcome: true,
          fields: {
            inbox: { value: ["welcome"] },
            echoed: { value: 0 },
            done: { value: false },
          },
          at: now,
        },
      ],
      result: null,
      wakeAt: null,
      createdAt: clock.now,
    },
  ]);

  expect(await db.select().from(probeTable)).toEqual([
    probeRow({ id: counterId, count: 2, echoed: 1 }),
  ]);
});

test("a counter announces that it reached its goal once, and not again when a later call replays it", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now + 60_000 },
    notes: { value: [] },
    helper: {},
  };

  await insert(workflowRow, {
    fields: { ...waiting, count: { value: 1 } },
    journal: [{ kind: "run", args: [2], fields: waiting, at: now - 1000 }],
    wakeAt: new Date(now + 60_000),
  });

  await insert(probeRow, { id: counterId, count: 1 });

  for (const amount of [1, 1]) {
    await request.post(`/api/probes/counters/${counterId}/add`, {
      data: { amount },
    });
  }

  expect(await db.select().from(probeCallTable)).toEqual([
    { workflowId: counterId, text: "reached 2" },
  ]);
});

test("a call after the deadline leaves the counter waiting when the tick has not run", async ({
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
    journal: [{ kind: "run", args: [2], fields: waiting, at: now - 60_000 }],
    wakeAt: new Date(now - 1000),
  });

  await insert(probeRow, { id: counterId });

  const response = await request.post(`/api/probes/counters/${counterId}/add`, {
    data: { amount: 1 },
  });

  expect(await response.json()).toEqual({ count: 1 });

  expect(await db.query.workflowTable.findMany()).toEqual([
    { ...counter, fields: { ...waiting, count: { value: 1 } } },
  ]);
});

test("two calls on one counter run one after the other", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now + 60_000 },
    notes: { value: [] },
    helper: {},
  };

  await insert(workflowRow, {
    fields: waiting,
    journal: [{ kind: "run", args: [10], fields: waiting, at: now }],
    wakeAt: new Date(now + 60_000),
  });

  await insert(probeRow, { id: counterId, count: 0 });

  const release = await holdRowLock(db, "workflow", counterId);

  const calls = [1, 2].map(
    async () =>
      await request.post(`/api/probes/counters/${counterId}/add`, {
        data: { amount: 1 },
      })
  );

  await waitForLockWaiters(db, 2);
  await release();

  const [first, second] = await Promise.all(calls);

  expect([await first!.json(), await second!.json()]).toEqual(
    expect.arrayContaining([{ count: 1 }, { count: 2 }])
  );

  expect(await db.select().from(probeTable)).toEqual([
    probeRow({ id: counterId, count: 2 }),
  ]);
});

test("a call fails and writes nothing", async ({
  request,
  db,
  insert,
  clock,
}) => {
  const now = clock.now.getTime();

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now + 60_000 },
    notes: { value: [] },
    helper: {},
  };

  const changed = await insert(workflowRow, {
    fields: waiting,
    journal: [
      { kind: "run", args: [2], fields: waiting, at: now },
      {
        kind: "resolve",
        command: 0,
        of: "result",
        outcome: { echoed: 1 },
        fields: waiting,
        at: now,
      },
    ],
  });

  const reordered = await insert(workflowRow, {
    id: "01960000-0000-7000-8000-000000000905",
    rootId: "01960000-0000-7000-8000-000000000905",
    fields: waiting,
    journal: [
      { kind: "run", args: [2], fields: waiting, at: now },
      {
        kind: "start",
        command: 0,
        child: "01960000-0000-7000-8000-000000000906",
      },
    ],
  });

  for (const { id, status, body } of [
    {
      id: "01960000-0000-7000-8000-000000000999",
      status: 404,
      body: "Workflow counter 01960000-0000-7000-8000-000000000999 could not be found",
    },
    { id: changed.id, status: 500, body: "Internal Server Error" },
    { id: reordered.id, status: 500, body: "Internal Server Error" },
  ]) {
    const response = await request.post(`/api/probes/counters/${id}/add`, {
      data: { amount: 1 },
    });

    expect({ status: response.status(), body: await response.text() }).toEqual({
      status,
      body,
    });
  }

  expect(
    await db.query.workflowTable.findMany({ orderBy: { id: "asc" } })
  ).toEqual([changed, reordered]);
  expect(await db.select().from(probeTable)).toEqual([]);
});
