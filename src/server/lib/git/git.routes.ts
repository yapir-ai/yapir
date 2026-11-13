import { executionMiddleware } from "@server/lib/executions/execution.middleware";
import { hono } from "@server/lib/hono/hono.factory";

export const gitRoutes = hono().all(
  "/:path{.+}",
  executionMiddleware,
  async (c) =>
    await c.var.container.gitProxyOperation.execute(
      c.req.raw,
      c.req.param("path"),
      c.var.execution
    )
);
