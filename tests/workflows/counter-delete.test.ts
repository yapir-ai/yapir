import { probeRow } from "@test/kit/factories/probe";
import { workflowRow } from "@test/kit/factories/workflow";
import { expect, test } from "@test/kit/test";
import { Counter } from "@test/kit/workflows/counter";
import { probeTable } from "@test/kit/workflows/probe-tables";
import { eq } from "drizzle-orm";

test("deleting a counter deletes its tree and its row in one transaction", async ({
  db,
  insert,
  probes: { engine },
}) => {
  const counter = await insert(workflowRow, {});

  await insert(workflowRow, {
    id: "01960000-0000-7000-8000-000000000902",
    type: "helper",
    rootId: counter.id,
    parentId: counter.id,
  });

  await insert(probeRow, { id: counter.id });

  await engine.transaction(async (unit) => {
    await unit.delete(Counter, counter.id);
    await unit.tx.delete(probeTable).where(eq(probeTable.id, counter.id));
  });

  expect(await db.query.workflowTable.findMany()).toEqual([]);
  expect(await db.select().from(probeTable)).toEqual([]);
});
