import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { AgentCreateRequest } from "./agent-create.dto";
import { AgentInfoParams } from "./agent-info.dto";
import { AgentListRequest } from "./agent-list.dto";
import { AgentUpdateRequest } from "./agent-update.dto";

export const agentRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "agentList",
      summary:
        "List agents: reusable instructions, model and harness, independent of any project",
    }),
    validator("query", AgentListRequest),
    async (c) => {
      const page = await c.var.container.agentListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .get(
    "/:agentId",
    describeRoute({ operationId: "agentInfo", summary: "Read an agent" }),
    validator("param", AgentInfoParams),
    async (c) => {
      const agent = await c.var.container.agentInfoOperation.execute(
        c.req.valid("param")
      );

      return c.json(agent);
    }
  )
  .post(
    "/:agentId/restore",
    describeRoute({
      operationId: "agentRestore",
      summary: "Restore a deleted agent, if its model provider is not deleted",
    }),
    validator("param", AgentInfoParams),
    async (c) =>
      c.json(
        await c.var.container.agentRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:agentId",
    describeRoute({ operationId: "agentUpdate", summary: "Update an agent" }),
    validator("param", AgentInfoParams),
    validator("json", AgentUpdateRequest),
    async (c) => {
      const agent = await c.var.container.agentUpdateOperation.execute(
        c.req.valid("param"),
        c.req.valid("json")
      );

      return c.json(agent);
    }
  )
  .delete(
    "/:agentId",
    describeRoute({
      operationId: "agentDelete",
      summary: "Delete an agent that no automation uses",
    }),
    validator("param", AgentInfoParams),
    async (c) => {
      await c.var.container.agentDeleteOperation.execute(c.req.valid("param"));

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({ operationId: "agentCreate", summary: "Create an agent" }),
    validator("json", AgentCreateRequest),
    async (c) => {
      const agent = await c.var.container.agentCreateOperation.execute(
        c.req.valid("json")
      );

      return c.json(agent, 201);
    }
  );
