import { hono } from "@server/lib/hono/hono.factory";
import { validator } from "hono-openapi";

import { WebhookInfoParams } from "./webhook-info.dto";

export const webhookDeliveryRoutes = hono().post(
  "/custom/:webhookId",
  validator("param", WebhookInfoParams),
  async (c) => {
    await c.var.container.webhookDeliveryOperation.execute(
      c.req.valid("param"),
      c.req.raw
    );

    return c.body(null, 204);
  }
);
