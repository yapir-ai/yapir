import type { HonoEnv } from "@server/lib/hono/hono.factory";
import { createMiddleware } from "hono/factory";

export const authenticatedMiddleware = createMiddleware<HonoEnv>(
  async (c, nextMiddleware) => {
    await c.var.container.currentUser.get();
    await nextMiddleware();
  }
);
