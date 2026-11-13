import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { ConnectionCreateRequest } from "./connection-create.dto";
import { ConnectionInfoParams } from "./connection-info.dto";
import { ConnectionListRequest } from "./connection-list.dto";
import { ConnectionUpdateRequest } from "./connection-update.dto";

export const connectionRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "connectionList",
      summary:
        "List connections: the organization access to GitHub, GitLab or Jira, at most one per type, without their secrets",
    }),
    validator("query", ConnectionListRequest),
    async (c) => {
      const page = await c.var.container.connectionListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .get(
    "/:type",
    describeRoute({
      operationId: "connectionInfo",
      summary: "Read the connection of a type, without its secrets",
    }),
    validator("param", ConnectionInfoParams),
    async (c) => {
      const connection = await c.var.container.connectionInfoOperation.execute(
        c.req.valid("param")
      );

      return c.json(connection);
    }
  )
  .patch(
    "/:type",
    describeRoute({
      operationId: "connectionUpdate",
      summary:
        "Update fields of the connection of a type, such as replacing a secret",
    }),
    validator("param", ConnectionInfoParams),
    validator("json", ConnectionUpdateRequest),
    async (c) => {
      const connection =
        await c.var.container.connectionUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        );

      return c.json(connection);
    }
  )
  .delete(
    "/:type",
    describeRoute({
      operationId: "connectionDelete",
      summary:
        "Delete the connection of a type: Yapir stops receiving its events and offering its capabilities",
    }),
    validator("param", ConnectionInfoParams),
    async (c) => {
      await c.var.container.connectionDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/gitlab/sync",
    describeRoute({
      operationId: "gitlabSync",
      summary:
        "Install Yapir's webhook on the GitLab projects its bot maintains, and import them",
    }),
    async (c) => {
      await c.var.container.gitlabSyncOperation.execute();

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "connectionCreate",
      summary:
        "Connect GitHub, GitLab or Jira, with the fields of its type, when that type has no connection yet",
    }),
    validator("json", ConnectionCreateRequest),
    async (c) => {
      const connection =
        await c.var.container.connectionCreateOperation.execute(
          c.req.valid("json")
        );

      return c.json(connection, 201);
    }
  );
