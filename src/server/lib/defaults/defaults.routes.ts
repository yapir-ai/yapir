import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { DefaultsUpdateRequest } from "./defaults-update.dto";

export const defaultsRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "defaultsInfo",
      summary:
        "Read the organization's defaults: the model the Assistant uses, and the model and harness new agents start with",
    }),
    async (c) => c.json(await c.var.container.defaultsInfoOperation.execute())
  )
  .patch(
    "/",
    describeRoute({
      operationId: "defaultsUpdate",
      summary: "Change the organization's defaults",
    }),
    validator("json", DefaultsUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.defaultsUpdateOperation.execute(
          c.req.valid("json")
        )
      )
  );
