import type { HonoEnv } from "@server/lib/hono/hono.factory";
import { createMiddleware } from "hono/factory";

import { createAppContainer } from "./container";
import type { Deps } from "./container";

export const containerMiddleware = (deps: Deps) =>
  createMiddleware<HonoEnv>(async (c, nextMiddleware) => {
    c.res = await createAppContainer(
      deps,
      c.env.executionContext,
      c.req.raw.headers
    ).respond(async (container) => {
      c.set("container", container);
      await nextMiddleware();

      return c.res;
    });
  });
