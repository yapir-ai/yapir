import type { Db } from "@server/lib/db";
import { sql } from "drizzle-orm";

export async function truncate(db: Db) {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  const tables = rows.map(({ tablename }) => `"${tablename}"`).join(", ");

  // The workflow of an attempt of the last test can still hold its task: wait for it before the other tables.
  await db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE task`);
    await tx.execute(sql.raw(`TRUNCATE ${tables} CASCADE`));
  });
}
