import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { NetworkPolicyUpdateRequest } from "./network-policy-update.dto";

export const networkPolicyRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "networkPolicyInfo",
      summary:
        "Read the organization's network policy: the hosts that the executions may reach, and Yapir's default hosts",
    }),
    async (c) =>
      c.json(await c.var.container.networkPolicyInfoOperation.execute())
  )
  .patch(
    "/",
    describeRoute({
      operationId: "networkPolicyUpdate",
      summary: "Change the organization's network policy",
    }),
    validator("json", NetworkPolicyUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.networkPolicyUpdateOperation.execute(
          c.req.valid("json")
        )
      )
  );
