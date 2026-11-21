import { serveStatic } from "@hono/bun";
import { app } from "@server";
import { systemClock } from "@server/lib/clock/clock";
import { createContent } from "@server/lib/content/content";
import { relations } from "@server/lib/db";
import { createMigrations } from "@server/lib/db/migration-apply.operation";
import { asValue } from "@server/lib/di/typed-container";
import { attemptWorkflows } from "@server/lib/tasks/attempt.workflow";
import { Cron } from "croner";
import { drizzle } from "drizzle-orm/node-postgres";
import { WorkflowEngine } from "effect/workflow";
import { Files } from "files-sdk";
import { bunS3 } from "files-sdk/bun-s3";
import { Hono } from "hono";

// Run from the repository root. Reads the files as import.meta.glob does: by their path from the root.
async function sourceFiles(pattern: string) {
  const files = await Array.fromAsync(new Bun.Glob(pattern).scan());

  return Object.fromEntries(
    await Promise.all(
      files
        .toSorted()
        .map(async (file): Promise<[string, string]> => [
          `/${file}`,
          await Bun.file(file).text(),
        ])
    )
  );
}

const databaseUrl = process.env.DATABASE_URL!;
const db = drizzle(databaseUrl, { relations });

const yapir = app({
  db: asValue(db),
  databaseUrl,
  // Bun's S3 client reads its bucket and credentials from the S3_ variables.
  files: new Files({ adapter: bunS3() }),
  content: createContent(await sourceFiles("src/content/**/*.md")),
  migrations: createMigrations(await sourceFiles("migrations/*/migration.sql")),
  clock: systemClock,
  superviseAttempt: async (attempt) => {
    await workflows.start(attempt);
  },
});

// In memory: a restart loses the workflows of the attempts in progress.
const workflows = attemptWorkflows(WorkflowEngine.layerMemory, yapir.attempts);

// Background work and cron ticks, awaited at shutdown. As on Workers, a failure is logged.
const pending = new Set<Promise<unknown>>();

async function track(promise: Promise<unknown>) {
  pending.add(promise);

  try {
    await promise;
  } catch (error) {
    console.error(error);
  } finally {
    pending.delete(promise);
  }
}

const ctx = {
  waitUntil(promise: Promise<unknown>) {
    void track(promise);
  },
};

await yapir.migrate(ctx);

const server = Bun.serve({
  // Model streams and Git transfers can stay silent longer than the default.
  idleTimeout: 0,
  fetch: new Hono()
    .all("/api/*", async (c) => await yapir.fetch(c.req.raw, ctx))
    .use(serveStatic({ root: "dist/client" }))
    .get("*", serveStatic({ path: "dist/client/index.html" })).fetch,
});

const cron = new Cron("* * * * *", () => {
  ctx.waitUntil(yapir.scheduled(Date.now(), ctx));
});

async function shutdown() {
  cron.stop();
  await server.stop();
  await Promise.allSettled(pending);
  await db.$client.end();
}

process.once("SIGTERM", () => {
  void shutdown();
});
