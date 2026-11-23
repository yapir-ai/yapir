import { expect } from "@playwright/test";

import type { TestDb } from "./test";

export async function holdRowLock(
  db: TestDb,
  table: "task" | "automation" | "workflow",
  id: string
) {
  const holder = await db.$client.connect();
  await holder.query("BEGIN");
  await holder.query(`SELECT id FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);

  return async () => {
    await holder.query("COMMIT");
    holder.release();
  };
}

export async function waitForLockWaiters(db: TestDb, count: number) {
  await expect
    .poll(async () => {
      const { rows } = await db.$client.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()"
      );

      return rows[0]!.n;
    })
    .toBe(count);
}
