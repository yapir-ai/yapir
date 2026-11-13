import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { EffectMetricsRequest } from "./effect-metrics.dto";
import { ExecutionMetricsRequest } from "./execution-metrics.dto";

export const metricsRoutes = hono()
  .get(
    "/executions",
    describeRoute({
      operationId: "executionMetrics",
      summary:
        "Aggregate the executions of the last 30 days, their tasks, usage and duration, by dimension and period",
    }),
    validator("query", ExecutionMetricsRequest),
    async (c) =>
      c.json(
        await c.var.container.executionMetricsOperation.execute(
          c.req.valid("query")
        )
      )
  )
  .get(
    "/effects",
    describeRoute({
      operationId: "effectMetrics",
      summary:
        "Count the effects of the last 30 days, the external resources that agents created or changed, by dimension and period",
    }),
    validator("query", EffectMetricsRequest),
    async (c) =>
      c.json(
        await c.var.container.effectMetricsOperation.execute(
          c.req.valid("query")
        )
      )
  );
