import type { Transaction } from "@server/lib/db";
import { and, eq, getTableColumns, getTableName } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";

export interface Row {
  readonly key: string;
  readonly snapshot: string;
  readonly write: (tx: Transaction) => Promise<void>;
}

const isKeyOf = <V extends object>(
  values: V,
  key: string
): key is Extract<keyof V, string> => key in values;

function primaryKey<V extends object>(table: PgTable, values: V) {
  const { columns, primaryKeys } = getTableConfig(table);

  const keyColumns =
    primaryKeys[0]?.columns ?? columns.filter((column) => column.primary);

  return Object.entries(getTableColumns(table)).flatMap(([key, column]) =>
    keyColumns.includes(column)
      ? [{ column, value: isKeyOf(values, key) ? values[key] : undefined }]
      : []
  );
}

function row<V extends object>(
  table: PgTable,
  values: V,
  statement: (
    tx: Transaction,
    key: ReturnType<typeof primaryKey<V>>
  ) => Promise<void>
): Row {
  const key = primaryKey(table, values);

  return {
    key: JSON.stringify([
      getTableName(table),
      ...key.map(({ value }) => value),
    ]),
    snapshot: JSON.stringify(values),
    write: async (tx) => await statement(tx, key),
  };
}

export function upsert<T extends PgTable>(
  table: T,
  values: InferInsertModel<T>
): Row {
  const target: PgTable = table;

  return row(target, values, async (tx, key) => {
    await tx
      .insert(target)
      .values(values)
      .onConflictDoUpdate({
        target: key.map(({ column }) => column),
        set: values,
      });
  });
}

export function update<T extends PgTable>(
  table: T,
  values: Partial<InferInsertModel<T>>
): Row {
  const target: PgTable = table;

  return row(target, values, async (tx, key) => {
    await tx
      .update(target)
      .set(values)
      .where(and(...key.map(({ column, value }) => eq(column, value))));
  });
}

export async function write(tx: Transaction, before: Row[], after: Row[]) {
  const written = new Map(before.map(({ key, snapshot }) => [key, snapshot]));

  for (const each of after) {
    if (written.get(each.key) !== each.snapshot) {
      await each.write(tx);
    }
  }
}
