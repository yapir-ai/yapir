import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { RepositoryListRequest } from "./repository-list.dto";

export const repositoryRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "repositoryList",
    summary:
      "List the Git repositories that Yapir knows from the connected Git hosts: all of them for Organization Admins, otherwise those of the projects you can read",
  }),
  validator("query", RepositoryListRequest),
  async (c) => {
    const page = await c.var.container.repositoryListOperation.execute(
      c.req.valid("query")
    );

    return c.json(page);
  }
);
