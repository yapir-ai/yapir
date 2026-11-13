import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";
import { v7 as uuidv7 } from "uuid";

import { AutomationCreateRequest } from "./automation-create.dto";
import { AutomationExecutionCreateRequest } from "./automation-execution-create.dto";
import { AutomationInfoRequest } from "./automation-info.dto";
import { AutomationListRequest } from "./automation-list.dto";
import { AutomationUpdateRequest } from "./automation-update.dto";
import { manualEventType } from "./manual.event";

export const automationRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "automationList",
      summary:
        "List automations: each brings together an agent, a project, event triggers and tool capabilities",
    }),
    validator("query", AutomationListRequest),
    async (c) => {
      const page = await c.var.container.automationListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "automationCreate",
      summary: "Create an automation, disabled",
    }),
    validator("json", AutomationCreateRequest),
    async (c) => {
      const automation =
        await c.var.container.automationCreateOperation.execute(
          c.req.valid("json")
        );

      return c.json(automation, 201);
    }
  )
  .get(
    "/:automationId",
    describeRoute({
      operationId: "automationInfo",
      summary: "Read an automation",
    }),
    validator("param", AutomationInfoRequest),
    async (c) =>
      c.json(
        await c.var.container.automationInfoOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .delete(
    "/:automationId",
    describeRoute({
      operationId: "automationDelete",
      summary: "Delete and disable an automation",
    }),
    validator("param", AutomationInfoRequest),
    async (c) => {
      await c.var.container.automationDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/:automationId/restore",
    describeRoute({
      operationId: "automationRestore",
      summary:
        "Restore a deleted automation, still disabled, if its agent and project are not deleted",
    }),
    validator("param", AutomationInfoRequest),
    async (c) =>
      c.json(
        await c.var.container.automationRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:automationId",
    describeRoute({
      operationId: "automationUpdate",
      summary: "Update an automation",
    }),
    validator("param", AutomationInfoRequest),
    validator("json", AutomationUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.automationUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        )
      )
  )
  .post(
    "/:automationId/executions",
    describeRoute({
      operationId: "automationExecutionCreate",
      summary: "Run the automation's agent manually, in a new task",
    }),
    validator("param", AutomationInfoRequest),
    validator("json", AutomationExecutionCreateRequest),
    async (c) => {
      const [accepted] = await c.var.container.eventProcessOperation.execute({
        id: uuidv7(),
        type: manualEventType,
        payload: {
          ...c.req.valid("param"),
          ...c.req.valid("json"),
        },
      });

      return c.json({ taskId: accepted!.taskId }, 201);
    }
  );
