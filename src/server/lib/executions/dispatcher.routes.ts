import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute } from "hono-openapi";

export const dispatcherRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "dispatcherList",
    summary:
      "List the execution environments an automation can run its agent in",
  }),
  async (c) =>
    c.json(
      [...(await c.var.container.dispatchers).values()].map(
        ({ name, label, gitHost }) => ({ name, label, gitHost })
      )
    )
);
