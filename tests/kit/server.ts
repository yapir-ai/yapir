import { cloudflareWorker } from "@server/cloudflare";
import type { Clock } from "@server/lib/clock/clock";
import { relations } from "@server/lib/db";
import { activity } from "@server/lib/workflows/activity";
import { workflowEngine } from "@server/lib/workflows/engine";
import type { WorkflowEngine } from "@server/lib/workflows/engine";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Hono } from "hono";

import { Counter } from "./workflows/counter";
import { Helper } from "./workflows/helper";
import { probeAnnounceOperation } from "./workflows/probe-announce.operation";
import { probeTable } from "./workflows/probe-tables";
import { Witness } from "./workflows/witness";

let time: Date | null = null;

// The time that PUT /api/clock sets, else the system time.
const clock: Clock = {
  get now() {
    return time ?? new Date();
  },
};

const yapir = cloudflareWorker(clock);

function probes() {
  const db = drizzle(env.HYPERDRIVE.connectionString, { relations });
  const activities: Promise<void>[] = [];

  const engine = workflowEngine({
    db,
    clock,
    executionContext: {
      waitUntil(promise: Promise<void>) {
        activities.push(promise);
      },
    },
    workflows: { counter: Counter, helper: Helper, witness: Witness },
    activities: [
      activity(probeAnnounceOperation, probeAnnounceOperation({ db })),
    ],
  });

  async function close() {
    await Promise.allSettled(activities);
    await db.$client.end();
  }

  return { engine, close };
}

// The Worker that `bun dev --mode test` serves: Yapir, with a clock that the tests set.
export default {
  ...yapir,
  fetch: new Hono<{ Bindings: Env; Variables: { engine: WorkflowEngine } }>()
    .put("/api/clock", async (c) => {
      const { now } = await c.req.json<{ now: string | null }>();
      time = now === null ? null : new Date(now);

      return c.body(null, 204);
    })
    .post("/api/cron", async (c) => {
      const { engine, close } = probes();

      await yapir.scheduled(
        { scheduledTime: clock.now.getTime() },
        c.env,
        c.executionCtx
      );
      await engine.sweep();
      await close();

      return c.body(null, 204);
    })
    .use("/api/probes/*", async (c, nextMiddleware) => {
      const { engine, close } = probes();
      c.set("engine", engine);
      await nextMiddleware();
      await close();
    })
    .post("/api/probes/counters/:id/add", async (c) => {
      const { amount, goal } = await c.req.json<{
        amount: number;
        goal?: number;
      }>();

      const counter =
        goal === undefined
          ? c.var.engine.get(Counter, c.req.param("id"))
          : c.var.engine.start(Counter, c.req.param("id"), goal);

      return c.json(await counter.add(amount));
    })
    .post("/api/probes/counters/:id/extend", async (c) => {
      const { duration } = await c.req.json<{ duration: number }>();
      await c.var.engine.get(Counter, c.req.param("id")).extend(duration);

      return c.body(null, 204);
    })
    .get("/api/probes/counters/:id", async (c) =>
      c.json(await c.var.engine.get(Counter, c.req.param("id")).report())
    )
    .delete("/api/probes/counters/:id", async (c) => {
      const id = c.req.param("id");

      await c.var.engine.transaction(async (unit) => {
        await unit.delete(Counter, id);
        await unit.tx.delete(probeTable).where(eq(probeTable.id, id));
      });

      return c.body(null, 204);
    })
    .post("/api/probes/helpers/:id/greet", async (c) => {
      const { text } = await c.req.json<{ text: string }>();
      await c.var.engine.get(Helper, c.req.param("id")).greet(text);

      return c.body(null, 204);
    })
    .post("/api/probes/helpers/:id/finish", async (c) => {
      await c.var.engine.get(Helper, c.req.param("id")).finish();

      return c.body(null, 204);
    })
    .post("/api/probes/witnesses/:id/add", async (c) => {
      const { item } = await c.req.json<{ item: string }>();
      await c.var.engine.start(Witness, c.req.param("id")).add(item);

      return c.body(null, 204);
    })
    .all("*", async (c) => await yapir.fetch(c.req.raw, c.env, c.executionCtx))
    .fetch,
} satisfies ExportedHandler<Env>;
