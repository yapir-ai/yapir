import type { Db } from "@server/lib/db";
import { repositoryTable } from "@server/lib/db/schema";
import { sql } from "drizzle-orm";

// A known repository keeps its ID and follows renames.
export async function importRepositories(
  db: Db,
  repositories: (typeof repositoryTable.$inferInsert)[]
) {
  await db
    .insert(repositoryTable)
    .values(repositories)
    .onConflictDoUpdate({
      target: [repositoryTable.host, repositoryTable.externalId],
      set: {
        provider: sql`excluded.provider`,
        path: sql`excluded.path`,
      },
    });
}
