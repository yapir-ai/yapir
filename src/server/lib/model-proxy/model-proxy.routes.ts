import { executionMiddleware } from "@server/lib/executions/execution.middleware";
import { hono } from "@server/lib/hono/hono.factory";

export const modelProxyRoutes = hono().all(
  "/:suffix{.+}",
  executionMiddleware,
  async (c) =>
    await c.var.container.modelProxyOperation.execute(
      c.req.raw,
      c.req.param("suffix"),
      c.var.execution.modelProviderId!,
      c.var.token
    )
);
