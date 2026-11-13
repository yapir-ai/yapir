import { app } from "@server";
import { systemClock } from "@server/lib/clock/clock";
import type { Clock } from "@server/lib/clock/clock";
import { createContent } from "@server/lib/content/content";
import { relations } from "@server/lib/db";
import { createMigrations } from "@server/lib/db/migration-apply.operation";
import { asFunction } from "@server/lib/di/typed-container";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/node-postgres";
import { Files } from "files-sdk";
import { r2 } from "files-sdk/r2";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";

// An instance with a fixed IP adds them to its configuration: see docs/deployment.md.
interface FixedIpBindings {
  FIXED_IP?: Fetcher;
  FIXED_IP_ADDRESS?: string;
}

// The Worker of Yapir. The automated tests give it their own clock.
export function cloudflareWorker(clock: Clock) {
  const { FIXED_IP, FIXED_IP_ADDRESS }: Env & FixedIpBindings = env;

  const yapir = app({
    // Hyperdrive pools the connections: each scope opens its own client.
    db: asFunction(() =>
      drizzle(env.HYPERDRIVE.connectionString, { relations })
    ).disposer(async (db) => {
      await db.$client.end();
    }),
    files: new Files({ adapter: r2({ binding: env.STATE_BUCKET }) }),
    content: createContent(
      import.meta.glob<string>("/src/content/**/*.md", {
        eager: true,
        query: "?raw",
        import: "default",
      })
    ),
    fixedIp:
      FIXED_IP && FIXED_IP_ADDRESS
        ? {
            address: FIXED_IP_ADDRESS,
            fetch: FIXED_IP.fetch.bind(FIXED_IP),
          }
        : undefined,
    migrations: createMigrations(
      import.meta.glob<string>("/migrations/*/migration.sql", {
        eager: true,
        query: "?raw",
        import: "default",
      })
    ),
    clock,
  });

  // Each deployment sets a new token, then applies the migrations of its version.
  const worker = new Hono()
    .post(
      "/api/migrations",
      bearerAuth({ token: env.MIGRATION_TOKEN }),
      async (c) => {
        await yapir.migrate(c.executionCtx);

        return c.body(null, 204);
      }
    )
    .all("*", async (c) => await yapir.fetch(c.req.raw, c.executionCtx));

  return {
    fetch: worker.fetch,
    async scheduled(
      controller: Pick<ScheduledController, "scheduledTime">,
      _env: Env,
      ctx: Pick<ExecutionContext, "waitUntil">
    ) {
      await yapir.scheduled(controller.scheduledTime, ctx);
    },
  } satisfies ExportedHandler<Env>;
}

export default cloudflareWorker(systemClock);
