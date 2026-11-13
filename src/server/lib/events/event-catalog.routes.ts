import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute } from "hono-openapi";

export const eventCatalogRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "eventCatalogList",
    summary:
      "List the event types triggers can select, with their payload JSON Schema and the capabilities a trigger on them grants",
  }),
  async (c) => c.json(await c.var.container.eventCatalogListOperation.execute())
);
