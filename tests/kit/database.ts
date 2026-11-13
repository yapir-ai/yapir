import type { Db } from "@server/lib/db";
import { sql } from "drizzle-orm";

export async function truncate(db: Db) {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  const tables = rows.map(({ tablename }) => `"${tablename}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE ${tables} CASCADE`));
}
