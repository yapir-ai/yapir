import type { Db, Transaction } from "@server/lib/db";
import { workflowTable } from "@server/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { encode } from "./codec";
import type { Instance } from "./runtime";

export interface Target {
  type: string;
  id: string;
}

export async function lockRoot(tx: Transaction, { type, id }: Target) {
  const root = alias(workflowTable, "root");

  const [locked] = await tx
    .select({ id: root.id })
    .from(workflowTable)
    .innerJoin(root, eq(root.id, workflowTable.rootId))
    .where(and(eq(workflowTable.id, id), eq(workflowTable.type, type)))
    .for("update", { of: root });

  return locked?.id;
}

export async function insertRoot(
  tx: Transaction,
  { type, id }: Target,
  now: number
) {
  const inserted = await tx
    .insert(workflowTable)
    .values({
      id,
      type,
      rootId: id,
      fields: {},
      journal: [],
      createdAt: new Date(now),
    })
    .onConflictDoNothing()
    .returning({ id: workflowTable.id });

  return inserted.length > 0;
}

export async function load(tx: Transaction, id: string) {
  const row = await tx.query.workflowTable.findFirst({ where: { id } });

  return row!;
}

export async function loadResult(tx: Transaction, id: string) {
  const row = await tx.query.workflowTable.findFirst({
    where: { id },
    columns: { result: true },
  });

  return row!.result;
}

export async function save(tx: Transaction, instance: Instance) {
  const { pending } = instance;

  const values = {
    fields: encode(instance),
    journal: instance.journal,
    result: instance.result,
    wakeAt:
      pending?.of === "until" && pending.deadline
        ? new Date(pending.deadline())
        : null,
  };

  await tx
    .insert(workflowTable)
    .values({
      id: instance.id,
      type: instance.type,
      rootId: instance.rootId,
      parentId: instance.parentId,
      createdAt: new Date(instance.createdAt),
      ...values,
    })
    .onConflictDoUpdate({ target: workflowTable.id, set: values });
}

export async function deleteTree(tx: Transaction, target: Target) {
  const rootId = await lockRoot(tx, target);

  if (rootId) {
    await tx.delete(workflowTable).where(eq(workflowTable.id, rootId));
  }
}

export async function due(db: Db, now: Date): Promise<Target[]> {
  return await db
    .select({ type: workflowTable.type, id: workflowTable.id })
    .from(workflowTable)
    .where(lt(workflowTable.wakeAt, now));
}
