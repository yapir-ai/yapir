import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute } from "hono-openapi";

export const providerCatalogRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "providerCatalogList",
    summary:
      "List the provider catalog: the known sources of models and their models, from which model providers are configured",
  }),
  async (c) =>
    c.json(await c.var.container.providerCatalogListOperation.execute())
);
