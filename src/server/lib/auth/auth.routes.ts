import { hono } from "@server/lib/hono/hono.factory";

export const authRoutes = hono()
  .get(
    "/get-session",
    async (c) => await c.var.container.sessionAuth.handler(c.req.raw)
  )
  .all("/*", async (c) => await c.var.container.auth.handler(c.req.raw));
