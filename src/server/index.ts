import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { generateSpecs } from "hono-openapi";

import { agentRoutes } from "./lib/agents/agent.routes";
import { createApi } from "./lib/api/api.server";
import type { Api } from "./lib/api/api.server";
import { authRoutes } from "./lib/auth/auth.routes";
import { authenticatedMiddleware } from "./lib/auth/authenticated.middleware";
import { automationRoutes } from "./lib/automations/automation.routes";
import { connectionRoutes } from "./lib/connections/connection.routes";
import { contentRoutes } from "./lib/content/content.routes";
import { conversationRoutes } from "./lib/conversations/conversation.routes";
import { defaultsRoutes } from "./lib/defaults/defaults.routes";
import { createAppContainer } from "./lib/di/container";
import type { Deps } from "./lib/di/container";
import { containerMiddleware } from "./lib/di/container.middleware";
import { effectRoutes } from "./lib/effects/effect.routes";
import { eventCatalogRoutes } from "./lib/events/event-catalog.routes";
import { eventRoutes } from "./lib/events/event.routes";
import { dispatcherRoutes } from "./lib/executions/dispatcher.routes";
import { executionMessageRoutes } from "./lib/executions/execution-message.routes";
import { executionRoutes } from "./lib/executions/execution.routes";
import { apiPath, runnerMount } from "./lib/executions/runner-path";
import { runnerRoutes } from "./lib/executions/runner.routes";
import { fixedIpRoutes } from "./lib/fixed-ip/fixed-ip.routes";
import { gitWebhookRoutes } from "./lib/git/git-webhook.routes";
import { hono } from "./lib/hono/hono.factory";
import type { HonoEnv } from "./lib/hono/hono.factory";
import { jiraWebhookRoutes } from "./lib/jira/jira-webhook.routes";
import { mcpServerRoutes } from "./lib/mcp-servers/mcp-server.routes";
import { metricsRoutes } from "./lib/metrics/metrics.routes";
import { modelProviderRoutes } from "./lib/model-providers/model-provider.routes";
import { networkPolicyRoutes } from "./lib/network-policy/network-policy.routes";
import { projectRoutes } from "./lib/projects/project.routes";
import { providerCatalogRoutes } from "./lib/provider-catalog/provider-catalog.routes";
import { repositoryRoutes } from "./lib/repositories/repository.routes";
import type { QueuedAttempt } from "./lib/tasks/machine/attempt";
import type { TaskMachine } from "./lib/tasks/task.machine";
import { taskRoutes } from "./lib/tasks/task.routes";
import { capabilityRoutes } from "./lib/tools/capability.routes";
import { userRoutes } from "./lib/users/user.routes";
import { webhookDeliveryRoutes } from "./lib/webhooks/webhook-delivery.routes";
import { webhookRoutes } from "./lib/webhooks/webhook.routes";

const authenticatedRoutes = (api: Api) =>
  hono()
    .use(authenticatedMiddleware)
    .route("/users", userRoutes)
    .route("/agents", agentRoutes)
    .all("/skills/*", async (c) => await api.handle(c))
    .route("/model-providers", modelProviderRoutes)
    .route("/provider-catalog", providerCatalogRoutes)
    .route("/connections", connectionRoutes)
    .route("/mcp-servers", mcpServerRoutes)
    .route("/fixed-ip", fixedIpRoutes)
    .route("/webhooks", webhookRoutes)
    .route("/defaults", defaultsRoutes)
    .route("/network-policy", networkPolicyRoutes)
    .route("/conversations", conversationRoutes)
    .route("/projects", projectRoutes)
    .route("/automations", automationRoutes)
    .route("/repositories", repositoryRoutes)
    .route("/event-catalog", eventCatalogRoutes)
    .route("/events", eventRoutes)
    .route("/effects", effectRoutes)
    .route("/capabilities", capabilityRoutes)
    .route("/dispatchers", dispatcherRoutes)
    .route("/tasks", taskRoutes)
    .route("/executions", executionRoutes)
    .route("/execution-messages", executionMessageRoutes)
    .route("/metrics", metricsRoutes);

const routes = (deps: Deps, api: Api) => {
  const authenticated = authenticatedRoutes(api);
  let document: ReturnType<typeof openApi> | undefined;

  async function openApi(c: Context<HonoEnv>) {
    const specs = await generateSpecs(
      authenticated,
      {
        documentation: {
          info: {
            title: "Yapir",
            version: "0.0.0",
            description: deps.content.glossary,
          },
          servers: [{ url: "/api" }],
        },
        includeEmptyPaths: true,
      },
      c
    );

    return {
      ...specs,
      paths: { ...specs.paths, ...api.openApi.paths },
      components: {
        ...specs.components,
        schemas: {
          ...specs.components.schemas,
          ...api.openApi.components.schemas,
        },
      },
    };
  }

  return (
    hono()
      .basePath(apiPath)
      .get("/health", (c) => c.json({ ok: true }))
      // Public, so the CLI can list its commands before login.
      .get("/openapi.json", async (c) =>
        c.json(await (document ??= openApi(c)))
      )
      .get("/docs", Scalar({ url: "/api/openapi.json" }))
      .use(containerMiddleware(deps))
      .route("/auth", authRoutes)
      .route("/content", contentRoutes)
      .route(runnerMount, runnerRoutes)
      .route("/webhooks", jiraWebhookRoutes)
      .route("/webhooks", gitWebhookRoutes)
      .route("/webhooks", webhookDeliveryRoutes)
      // Mounted last: requests answered by the routes above never reach its authenticated middleware.
      .route("/", authenticated)
  );
};

export type AppType = ReturnType<typeof routes>;

export function app(deps: Deps) {
  const api = routes(deps, createApi(deps));

  async function fetch(
    request: Request,
    ctx: Pick<ExecutionContext, "waitUntil">
  ) {
    return await api.fetch(request, { executionContext: ctx });
  }

  async function scheduled(
    time: number,
    ctx: Pick<ExecutionContext, "waitUntil">
  ) {
    await createAppContainer(deps, ctx).run(
      async ({ cronDispatch }) => await cronDispatch.execute(time)
    );
  }

  async function migrate(ctx: Pick<ExecutionContext, "waitUntil">) {
    await createAppContainer(deps, ctx).run(
      async ({ migrationApplyOperation }) =>
        await migrationApplyOperation.execute()
    );
  }

  // The workflow of an attempt runs outside a request: each step has its own scope, which awaits its background work.
  const background = {
    waitUntil(promise: Promise<unknown>) {
      void promise;
    },
  };

  async function supervise<T>(step: (machine: TaskMachine) => Promise<T>) {
    return await createAppContainer(deps, background).run(
      async ({ taskMachine }) => await step(taskMachine)
    );
  }

  const attempts = {
    dispatch: async (attempt: QueuedAttempt) =>
      await supervise(async (machine) => await machine.dispatch(attempt)),
    lease: async (attempt: QueuedAttempt) =>
      await supervise(async (machine) => await machine.lease(attempt)),
  };

  return { fetch, scheduled, migrate, attempts };
}
