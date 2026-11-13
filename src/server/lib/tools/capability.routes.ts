import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute } from "hono-openapi";

export const capabilityRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "capabilityList",
    summary: "List the tool capabilities an automation can grant its agent",
  }),
  async (c) => c.json(await c.var.container.capabilityListOperation.execute())
);
