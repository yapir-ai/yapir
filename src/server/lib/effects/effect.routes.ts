import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { EffectListRequest } from "./effect-list.dto";

export const effectRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "effectList",
    summary:
      "List the effects of tasks: the external resources their agents created or changed, such as comments",
  }),
  validator("query", EffectListRequest),
  async (c) =>
    c.json(
      await c.var.container.effectListOperation.execute(c.req.valid("query"))
    )
);
