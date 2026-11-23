import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { Helper } from "@test/kit/workflows/helper";
import { probeTable } from "@test/kit/workflows/probe-tables";

test("the counter resumes in the commit where its helper returns, and continues as new", async ({
  db,
  insert,
  probes: { engine, clock },
}) => {
  const now = clock.now.getTime();
  const counterId = "01960000-0000-7000-8000-000000000901";
  const helperId = "01960000-0000-7000-8000-000000000902";

  const waiting = {
    count: { value: 0 },
    rounds: { value: 0 },
    expiresAt: { value: now + 60_000 },
    notes: { value: [] },
    helper: {},
  };

  const started = {
    ...waiting,
    count: { value: 2 },
    notes: { value: ["round 0 started", "welcome"] },
    helper: { child: helperId },
  };

  const counter = await insert(workflowRow, {
    id: counterId,
    rootId: counterId,
    fields: started,
    journal: [
      { kind: "run", args: [2], fields: waiting, at: now - 1000 },
      {
        kind: "resolve",
        command: 0,
        of: "until",
        outcome: true,
        fields: { ...waiting, count: { value: 2 } },
        at: now - 1000,
      },
      { kind: "start", command: 1, child: helperId },
    ],
  });

  const helper = await insert(workflowRow, {
    id: helperId,
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
        at: now - 1000,
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
        at: now - 1000,
      },
    ],
  });

  await insert(probeRow, { id: counterId, count: 2, echoed: 1 });

  await engine.get(Helper, helperId).finish();

  const continued = {
    ...waiting,
    rounds: { value: 1 },
    notes: { value: ["round 0 started", "welcome", "echoed 1"] },
  };

  expect(
    await db.query.workflowTable.findMany({ orderBy: { type: "asc" } })
  ).toEqual([
    {
      ...counter,
      fields: continued,
      journal: [{ kind: "run", args: [2], fields: continued, at: now }],
      wakeAt: new Date(now + 60_000),
    },
    {
      ...helper,
      fields: { ...helper.fields, done: { value: true } },
      journal: [],
      result: { echoed: 1 },
    },
  ]);

  expect(await db.select().from(probeTable)).toEqual([
    probeRow({ id: counterId, count: 0, rounds: 1, echoed: 1 }),
  ]);
});
