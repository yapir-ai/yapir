import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { McpServerCreateRequest } from "./mcp-server-create.dto";
import { McpServerInfoParams } from "./mcp-server-info.dto";
import { McpServerListRequest } from "./mcp-server-list.dto";
import { McpServerUpdateRequest } from "./mcp-server-update.dto";

export const mcpServerRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "mcpServerList",
      summary:
        "List MCP servers: remote servers whose tools automations can grant their agent",
    }),
    validator("query", McpServerListRequest),
    async (c) =>
      c.json(
        await c.var.container.mcpServerListOperation.execute(
          c.req.valid("query")
        )
      )
  )
  .get(
    "/:mcpServerId",
    describeRoute({
      operationId: "mcpServerInfo",
      summary: "Read an MCP server and its tools, without its header value",
    }),
    validator("param", McpServerInfoParams),
    async (c) =>
      c.json(
        await c.var.container.mcpServerInfoOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .post(
    "/:mcpServerId/restore",
    describeRoute({
      operationId: "mcpServerRestore",
      summary: "Restore a deleted MCP server",
    }),
    validator("param", McpServerInfoParams),
    async (c) =>
      c.json(
        await c.var.container.mcpServerRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:mcpServerId",
    describeRoute({
      operationId: "mcpServerUpdate",
      summary: "Update an MCP server and refresh its tools",
    }),
    validator("param", McpServerInfoParams),
    validator("json", McpServerUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.mcpServerUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        )
      )
  )
  .delete(
    "/:mcpServerId",
    describeRoute({
      operationId: "mcpServerDelete",
      summary:
        "Delete an MCP server: automations' executions no longer receive its tools",
    }),
    validator("param", McpServerInfoParams),
    async (c) => {
      await c.var.container.mcpServerDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "mcpServerCreate",
      summary: "Create an MCP server and list its tools",
    }),
    validator("json", McpServerCreateRequest),
    async (c) =>
      c.json(
        await c.var.container.mcpServerCreateOperation.execute(
          c.req.valid("json")
        ),
        201
      )
  );
