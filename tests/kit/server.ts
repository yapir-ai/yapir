import { cloudflareWorker } from "@server/cloudflare-worker";
import type { Clock } from "@server/lib/clock/clock";
import { Hono } from "hono";

export { ClusterWorkflow } from "@effect/platform-cloudflare/CloudflareDurableObjects";

let time: Date | null = null;

// The time that PUT /api/clock sets, else the system time.
const clock: Clock = {
  get now() {
    return time ?? new Date();
  },
};

const { worker: yapir, attempts } = cloudflareWorker(clock);

// The Worker that `bun dev --mode test` serves: Yapir, with a clock that the tests set, and the lease check that the workflow of an attempt runs when its timer ends.
export default {
  ...yapir,
  fetch: new Hono<{ Bindings: Env }>()
    .put("/api/clock", async (c) => {
      const { now } = await c.req.json<{ now: string | null }>();
      time = now === null ? null : new Date(now);

      return c.body(null, 204);
    })
    .post("/api/cron", async (c) => {
      await yapir.scheduled(
        { scheduledTime: clock.now.getTime() },
        c.env,
        c.executionCtx
      );

      return c.body(null, 204);
    })
    .post("/api/attempts/lease", async (c) =>
      c.json({ remaining: await attempts.lease(await c.req.json()) })
    )
    .all("*", async (c) => await yapir.fetch(c.req.raw, c.env, c.executionCtx))
    .fetch,
} satisfies ExportedHandler<Env>;
