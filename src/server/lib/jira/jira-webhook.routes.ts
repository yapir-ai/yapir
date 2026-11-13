import { hono } from "@server/lib/hono/hono.factory";

export const jiraWebhookRoutes = hono().post("/jira", async (c) => {
  const jiraWebhookDispatch = await c.var.container.jiraWebhookDispatch;

  if (!jiraWebhookDispatch) {
    return await c.notFound();
  }

  await jiraWebhookDispatch.execute({
    // Stable across retries.
    id: c.req.header("x-atlassian-webhook-identifier") ?? "",
    signature: c.req.header("x-hub-signature") ?? "",
    body: await c.req.text(),
  });

  return c.body(null, 204);
});
