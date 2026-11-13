import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { ExecutionListRequest } from "./execution-list.dto";

export const executionRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "executionList",
    summary: "List executions: activations of an agent to advance a task",
  }),
  validator("query", ExecutionListRequest),
  async (c) =>
    c.json(
      await c.var.container.executionListOperation.execute(c.req.valid("query"))
    )
);
