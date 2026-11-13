import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { EventListRequest } from "./event-list.dto";

export const eventRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "eventList",
    summary:
      "List the events accepted by tasks, newest first. Each data is what a trigger CEL expression evaluates as event",
  }),
  validator("query", EventListRequest),
  async (c) =>
    c.json(
      await c.var.container.eventListOperation.execute(c.req.valid("query"))
    )
);
