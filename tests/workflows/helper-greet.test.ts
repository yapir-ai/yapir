import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { probeTable } from "@test/kit/workflows/probe-tables";

test("a greeting reaches the counter, and only the rows that changed are written", async ({
  request,
  db,
  insert,
  clock,
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

  const counter = await insert(workflowRow, {
    id: counterId,
    rootId: counterId,
    fields: {
      ...waiting,
      count: { value: 2 },
      notes: { value: ["round 0 started", "welcome"] },
      helper: { child: helperId },
    },
    journal: [
      { kind: "run", args: [2], fields: waiting, at: now },
      {
        kind: "resolve",
        command: 0,
        of: "until",
        outcome: true,
        fields: { ...waiting, count: { value: 2 } },
        at: now,
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
  });

  await insert(probeRow, { id: counterId, count: 99, echoed: 1 });

  const response = await request.post(`/api/probes/helpers/${helperId}/greet`, {
    data: { text: "hello" },
  });

  expect(response.status()).toBe(204);

  expect(
    await db.query.workflowTable.findMany({ orderBy: { type: "asc" } })
  ).toEqual([
    {
      ...counter,
      fields: {
        ...counter.fields,
        notes: { value: ["round 0 started", "welcome", "hello"] },
      },
    },
    {
      ...helper,
      fields: { ...helper.fields, echoed: { value: 2 } },
      journal: [
        ...helper.journal,
        {
          kind: "resolve",
          command: 1,
          of: "until",
          outcome: true,
          fields: {
            inbox: { value: ["hello"] },
            echoed: { value: 1 },
            done: { value: false },
          },
          at: now,
        },
      ],
    },
  ]);

  expect(await db.select().from(probeTable)).toEqual([
    probeRow({ id: counterId, count: 99, echoed: 2 }),
  ]);
});
