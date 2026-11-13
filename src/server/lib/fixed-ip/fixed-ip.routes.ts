import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute } from "hono-openapi";

export const fixedIpRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "fixedIpInfo",
    summary:
      "Read the fixed IP of the instance, which MCP servers with fixedIp receive requests from: null when the instance has none",
  }),
  (c) => c.json(c.var.container.fixedIpInfoOperation.execute())
);
