import type { Db } from "@server/lib/db";
import { sql } from "drizzle-orm";

// The candidates of an event concerning no repository: every enabled automation with a trigger of its type.
export function triggeredAutomations(db: Db) {
  return async ({ type }: { type: string }) =>
    await db.query.automationTable.findMany({
      where: {
        enabled: true,
        RAW: (automation) =>
          sql`${automation.triggers} @> ${JSON.stringify([{ type }])}::jsonb`,
      },
    });
}
