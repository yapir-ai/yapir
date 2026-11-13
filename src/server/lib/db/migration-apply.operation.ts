import { createHash } from "node:crypto";
import path from "node:path";

import type { Db } from "@server/lib/db";
import { sql } from "drizzle-orm";
import { formatToMillis } from "drizzle-orm/migrator.utils";
import { migrate } from "drizzle-orm/pg-core/async";

// The migrations of drizzle-kit, by their path from the repository root, read as drizzle-kit reads them.
export function createMigrations(files: Record<string, string>) {
  return Object.entries(files)
    .map(([file, query]) => {
      const name = path.basename(path.dirname(file));

      return {
        name,
        sql: query.split("--> statement-breakpoint"),
        bps: true,
        folderMillis: formatToMillis(name.slice(0, 14)),
        hash: createHash("sha256").update(query).digest("hex"),
      };
    })
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

export type Migrations = ReturnType<typeof createMigrations>;

export function migrationApplyOperation({
  db,
  migrations,
}: {
  db: Db;
  migrations: Migrations;
}) {
  // Instances that start together apply the migrations one at a time.
  async function execute() {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('migrations'))`
      );
      await migrate(migrations, tx, { migrationsFolder: "migrations" });
    });
  }

  return { execute };
}
