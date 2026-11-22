import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { probeTable } from "@test/kit/workflows/probe-tables";

test("deleting a counter deletes its tree and its row in one transaction", async ({
  request,
  db,
  insert,
}) => {
  const counter = await insert(workflowRow, {});

  await insert(workflowRow, {
    id: "01960000-0000-7000-8000-000000000902",
    type: "helper",
    rootId: counter.id,
    parentId: counter.id,
  });

  await insert(probeRow, { id: counter.id });

  const response = await request.delete(`/api/probes/counters/${counter.id}`);

  expect(response.status()).toBe(204);
  expect(await db.query.workflowTable.findMany()).toEqual([]);
  expect(await db.select().from(probeTable)).toEqual([]);
});
