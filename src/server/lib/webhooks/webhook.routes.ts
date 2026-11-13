import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { WebhookCreateRequest } from "./webhook-create.dto";
import { WebhookInfoParams } from "./webhook-info.dto";
import { WebhookListRequest } from "./webhook-list.dto";
import { WebhookUpdateRequest } from "./webhook-update.dto";

export const webhookRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "webhookList",
      summary:
        "List webhooks: endpoints whose deliveries trigger automations, authenticated by a header secret or an HMAC signature",
    }),
    validator("query", WebhookListRequest),
    async (c) =>
      c.json(
        await c.var.container.webhookListOperation.execute(c.req.valid("query"))
      )
  )
  .get(
    "/:webhookId",
    describeRoute({
      operationId: "webhookInfo",
      summary: "Read a webhook, without its secret",
    }),
    validator("param", WebhookInfoParams),
    async (c) =>
      c.json(
        await c.var.container.webhookInfoOperation.execute(c.req.valid("param"))
      )
  )
  .post(
    "/:webhookId/restore",
    describeRoute({
      operationId: "webhookRestore",
      summary: "Restore a deleted webhook",
    }),
    validator("param", WebhookInfoParams),
    async (c) =>
      c.json(
        await c.var.container.webhookRestoreOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .patch(
    "/:webhookId",
    describeRoute({
      operationId: "webhookUpdate",
      summary: "Update a webhook",
    }),
    validator("param", WebhookInfoParams),
    validator("json", WebhookUpdateRequest),
    async (c) =>
      c.json(
        await c.var.container.webhookUpdateOperation.execute(
          c.req.valid("param"),
          c.req.valid("json")
        )
      )
  )
  .delete(
    "/:webhookId",
    describeRoute({
      operationId: "webhookDelete",
      summary:
        "Delete a webhook: its deliveries are refused, automations keep their triggers",
    }),
    validator("param", WebhookInfoParams),
    async (c) => {
      await c.var.container.webhookDeleteOperation.execute(
        c.req.valid("param")
      );

      return c.body(null, 204);
    }
  )
  .post(
    "/",
    describeRoute({
      operationId: "webhookCreate",
      summary:
        "Create a webhook: deliveries go to POST /api/webhooks/custom/{webhookId}",
    }),
    validator("json", WebhookCreateRequest),
    async (c) =>
      c.json(
        await c.var.container.webhookCreateOperation.execute(
          c.req.valid("json")
        ),
        201
      )
  );
