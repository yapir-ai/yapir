import { hono } from "@server/lib/hono/hono.factory";
import { validator } from "hono-openapi";

import { GitWebhookParams } from "./git-webhook.dto";

export const gitWebhookRoutes = hono().post(
  "/:provider",
  validator("param", GitWebhookParams),
  async (c) => {
    const { container } = c.var;

    const gitHost = (await container.gitHosts).get(
      c.req.valid("param").provider
    );

    if (!gitHost) {
      return await c.notFound();
    }

    await gitHost.receiveWebhook(c.req.raw, container);

    return c.body(null, 204);
  }
);
