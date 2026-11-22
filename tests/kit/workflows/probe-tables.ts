import type { Db } from "@server/lib/db";
import { sql } from "drizzle-orm";
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const probeTable = pgTable("probe", {
  id: uuid().primaryKey(),
  count: integer().notNull(),
  rounds: integer().notNull(),
  echoed: integer(),
});

export const probeCallTable = pgTable("probe_call", {
  workflowId: uuid("workflow_id").notNull(),
  text: text().notNull(),
});

export async function createProbeTables(db: Db) {
  await db.execute(sql`
    CREATE TABLE probe (id uuid PRIMARY KEY, count integer NOT NULL, rounds integer NOT NULL, echoed integer);
    CREATE TABLE probe_call (workflow_id uuid NOT NULL, text text NOT NULL);
  `);
}
