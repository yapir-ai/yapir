import { agentCreateOperation } from "@server/lib/agents/agent-create.operation";
import { agentDeleteOperation } from "@server/lib/agents/agent-delete.operation";
import { agentInfoOperation } from "@server/lib/agents/agent-info.operation";
import { agentListOperation } from "@server/lib/agents/agent-list.operation";
import { agentRestoreOperation } from "@server/lib/agents/agent-restore.operation";
import { agentUpdateOperation } from "@server/lib/agents/agent-update.operation";
import { assistantInstructions } from "@server/lib/assistant/assistant-instructions";
import { assistantModel } from "@server/lib/assistant/assistant-model";
import { assistantTools } from "@server/lib/assistant/assistant-tools";
import { auth, sessionAuth } from "@server/lib/auth/auth";
import { currentUser } from "@server/lib/auth/current-user";
import { automationCreateOperation } from "@server/lib/automations/automation-create.operation";
import { automationDeleteOperation } from "@server/lib/automations/automation-delete.operation";
import { automationInfoOperation } from "@server/lib/automations/automation-info.operation";
import { automationListOperation } from "@server/lib/automations/automation-list.operation";
import { automationRestoreOperation } from "@server/lib/automations/automation-restore.operation";
import { automationUpdateOperation } from "@server/lib/automations/automation-update.operation";
import { automationService } from "@server/lib/automations/automation.service";
import { automationValidator } from "@server/lib/automations/automation.validator";
import { manualEvent } from "@server/lib/automations/manual.event";
import type { Clock } from "@server/lib/clock/clock";
import { connectionCreateOperation } from "@server/lib/connections/connection-create.operation";
import { connectionDeleteOperation } from "@server/lib/connections/connection-delete.operation";
import { connectionInfoOperation } from "@server/lib/connections/connection-info.operation";
import { connectionListOperation } from "@server/lib/connections/connection-list.operation";
import { connectionUpdateOperation } from "@server/lib/connections/connection-update.operation";
import {
  findConnection,
  toConnection,
} from "@server/lib/connections/connection.dto";
import type {
  Connection,
  ConnectionOf,
  ConnectionType,
} from "@server/lib/connections/connection.dto";
import type { Content } from "@server/lib/content/content";
import { conversationInfoOperation } from "@server/lib/conversations/conversation-info.operation";
import { conversationListOperation } from "@server/lib/conversations/conversation-list.operation";
import { conversationMessageCreateOperation } from "@server/lib/conversations/conversation-message-create.operation";
import { conversationPurgeOperation } from "@server/lib/conversations/conversation-purge.operation";
import { cronDispatch } from "@server/lib/cron/cron-dispatch";
import type { Db } from "@server/lib/db";
import { migrationApplyOperation } from "@server/lib/db/migration-apply.operation";
import type { Migrations } from "@server/lib/db/migration-apply.operation";
import type { McpServerSelect } from "@server/lib/db/schema";
import { defaultsInfoOperation } from "@server/lib/defaults/defaults-info.operation";
import { defaultsUpdateOperation } from "@server/lib/defaults/defaults-update.operation";
import { effectListOperation } from "@server/lib/effects/effect-list.operation";
import { effectService } from "@server/lib/effects/effect.service";
import { apiEnvSchema } from "@server/lib/env";
import type { ApiEnv } from "@server/lib/env";
import { eventCatalogListOperation } from "@server/lib/events/event-catalog-list.operation";
import type {
  EventRegistry,
  TriggerEventRegistry,
} from "@server/lib/events/event-definition";
import { eventFilterService } from "@server/lib/events/event-filter.service";
import { eventListOperation } from "@server/lib/events/event-list.operation";
import { eventProcessOperation } from "@server/lib/events/event-process.operation";
import type { Dispatchers } from "@server/lib/executions/dispatcher";
import { executionListOperation } from "@server/lib/executions/execution-list.operation";
import { executionMessageCreateOperation } from "@server/lib/executions/execution-message-create.operation";
import { executionMessageListOperation } from "@server/lib/executions/execution-message-list.operation";
import { localDispatcher } from "@server/lib/executions/local.dispatcher";
import { fixedIpInfoOperation } from "@server/lib/fixed-ip/fixed-ip-info.operation";
import type { FixedIp } from "@server/lib/fixed-ip/fixed-ip.dto";
import { gitHostEntries } from "@server/lib/git/git-host";
import type { GitHosts } from "@server/lib/git/git-host";
import { gitProxyOperation } from "@server/lib/git/git-proxy.operation";
import { githubInstallationOperation } from "@server/lib/github/github-installation.operation.ts";
import { githubHost } from "@server/lib/github/github.host";
import { gitlabSyncOperation } from "@server/lib/gitlab/gitlab-sync.operation";
import { gitlabWebhookSync } from "@server/lib/gitlab/gitlab-webhook-sync";
import { gitlabHost } from "@server/lib/gitlab/gitlab.host";
import { jiraWebhookDispatch } from "@server/lib/jira/jira-webhook-dispatch";
import { jiraIntegration } from "@server/lib/jira/jira.integration";
import type { JiraIntegration } from "@server/lib/jira/jira.integration";
import { mcpServerCreateOperation } from "@server/lib/mcp-servers/mcp-server-create.operation";
import { mcpServerDeleteOperation } from "@server/lib/mcp-servers/mcp-server-delete.operation";
import { mcpServerInfoOperation } from "@server/lib/mcp-servers/mcp-server-info.operation";
import { mcpServerListOperation } from "@server/lib/mcp-servers/mcp-server-list.operation";
import { mcpServerRefreshOperation } from "@server/lib/mcp-servers/mcp-server-refresh.operation";
import { mcpServerRestoreOperation } from "@server/lib/mcp-servers/mcp-server-restore.operation";
import { mcpServerUpdateOperation } from "@server/lib/mcp-servers/mcp-server-update.operation";
import { mcpServerCapabilities } from "@server/lib/mcp-servers/mcp-server.capabilities";
import { mcpServerClient } from "@server/lib/mcp-servers/mcp-server.client";
import type { McpServerClient } from "@server/lib/mcp-servers/mcp-server.client";
import { effectMetricsOperation } from "@server/lib/metrics/effect-metrics.operation";
import { executionMetricsOperation } from "@server/lib/metrics/execution-metrics.operation";
import { modelProviderCreateOperation } from "@server/lib/model-providers/model-provider-create.operation";
import { modelProviderDeleteOperation } from "@server/lib/model-providers/model-provider-delete.operation";
import { modelProviderInfoOperation } from "@server/lib/model-providers/model-provider-info.operation";
import { modelProviderListOperation } from "@server/lib/model-providers/model-provider-list.operation";
import { modelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";
import { modelProviderRestoreOperation } from "@server/lib/model-providers/model-provider-restore.operation";
import { modelProviderUpdateOperation } from "@server/lib/model-providers/model-provider-update.operation";
import { modelProxyOperation } from "@server/lib/model-proxy/model-proxy.operation";
import { networkPolicyInfoOperation } from "@server/lib/network-policy/network-policy-info.operation";
import { networkPolicyUpdateOperation } from "@server/lib/network-policy/network-policy-update.operation";
import { projectMemberCreateOperation } from "@server/lib/project-members/project-member-create.operation";
import { projectMemberDeleteOperation } from "@server/lib/project-members/project-member-delete.operation";
import { projectMemberListOperation } from "@server/lib/project-members/project-member-list.operation";
import { projectMemberUpdateOperation } from "@server/lib/project-members/project-member-update.operation";
import { projectRepositoryCreateOperation } from "@server/lib/project-repositories/project-repository-create.operation";
import { projectRepositoryDeleteOperation } from "@server/lib/project-repositories/project-repository-delete.operation";
import { projectRepositoryListOperation } from "@server/lib/project-repositories/project-repository-list.operation";
import { projectCreateOperation } from "@server/lib/projects/project-create.operation";
import { projectDeleteOperation } from "@server/lib/projects/project-delete.operation";
import { projectInfoOperation } from "@server/lib/projects/project-info.operation";
import { projectListOperation } from "@server/lib/projects/project-list.operation";
import { projectRestoreOperation } from "@server/lib/projects/project-restore.operation";
import { projectUpdateOperation } from "@server/lib/projects/project-update.operation";
import { providerCatalogListOperation } from "@server/lib/provider-catalog/provider-catalog-list.operation";
import { repositoryListOperation } from "@server/lib/repositories/repository-list.operation";
import { scheduleEvent } from "@server/lib/schedules/schedule.event";
import type { QueuedAttempt } from "@server/lib/tasks/machine/attempt";
import { taskListOperation } from "@server/lib/tasks/task-list.operation";
import { taskMessageEvent } from "@server/lib/tasks/task-message.event";
import { taskPurgeOperation } from "@server/lib/tasks/task-purge.operation";
import { taskSessionInfoOperation } from "@server/lib/tasks/task-session-info.operation";
import { taskSessionUpdateOperation } from "@server/lib/tasks/task-session-update.operation";
import { taskMachine } from "@server/lib/tasks/task.machine";
import { taskService } from "@server/lib/tasks/task.service";
import type { CapabilityRegistry } from "@server/lib/tools/capability-definition";
import { capabilityListOperation } from "@server/lib/tools/capability-list.operation";
import { taskMcpOperation } from "@server/lib/tools/task-mcp.operation";
import { userListOperation } from "@server/lib/users/user-list.operation";
import { userUpdateOperation } from "@server/lib/users/user-update.operation";
import { webhookCreateOperation } from "@server/lib/webhooks/webhook-create.operation";
import { webhookDeleteOperation } from "@server/lib/webhooks/webhook-delete.operation";
import { webhookDeliveryOperation } from "@server/lib/webhooks/webhook-delivery.operation";
import { webhookInfoOperation } from "@server/lib/webhooks/webhook-info.operation";
import { webhookListOperation } from "@server/lib/webhooks/webhook-list.operation";
import { webhookRestoreOperation } from "@server/lib/webhooks/webhook-restore.operation";
import { webhookUpdateOperation } from "@server/lib/webhooks/webhook-update.operation";
import { webhookEvents } from "@server/lib/webhooks/webhook.event";
import type { Resolver } from "awilix";
import type { Files } from "files-sdk";

import { asFunction, asValue, createContainer } from "./typed-container";

// What the platform provides: src/server/cloudflare.ts or src/server/bun.ts.
export interface Deps {
  db: Resolver<Db>;
  files: Files;
  content: Content;
  migrations: Migrations;
  fixedIp?: FixedIp;
  clock: Clock;
  superviseAttempt: (attempt: QueuedAttempt) => Promise<void>;
  databaseUrl: string;
}

// Undefined when the Connection of the type does not exist.
const connected = <T extends ConnectionType, Services, Service>(
  type: T,
  create: (connection: ConnectionOf<T>, services: Services) => Service
) =>
  asFunction(
    async (services: Services & { connections: Promise<Connection[]> }) => {
      const connection = findConnection(await services.connections, type);

      return connection && create(connection, services);
    }
  );

function createServices(
  deps: Deps,
  executionContext: Pick<ExecutionContext, "waitUntil">,
  headers: Headers
) {
  return createContainer({
    env: asFunction(() => apiEnvSchema.parse(process.env)),
    db: deps.db,
    files: asValue(deps.files),
    content: asValue(deps.content),
    migrations: asValue(deps.migrations),
    fixedIp: asValue(deps.fixedIp),
    executionContext: asValue(executionContext),
    headers: asValue(headers),
    clock: asValue(deps.clock),
    superviseAttempt: asValue(deps.superviseAttempt),
    auth: asFunction(auth),
    sessionAuth: asFunction(sessionAuth),
    currentUser: asFunction(currentUser),
    connections: asFunction(async ({ db }: { db: Db }) =>
      (await db.query.connectionTable.findMany()).map(toConnection)
    ),
    mcpServers: asFunction(
      async ({ db }: { db: Db }) =>
        await db.query.mcpServerTable.findMany({
          where: { deletedAt: { isNull: true } },
        })
    ),
    gitHosts: asFunction(
      async (
        services: Parameters<typeof githubHost>[1] &
          Parameters<typeof gitlabHost>[1] & {
            connections: Promise<Connection[]>;
          }
      ): Promise<GitHosts> => {
        const gitHosts = (await services.connections).flatMap((connection) => {
          if (connection.type === "github") {
            return [githubHost(connection, services)];
          }

          if (connection.type === "gitlab") {
            return [gitlabHost(connection, services)];
          }

          return [];
        });

        return new Map(gitHosts.map((gitHost) => [gitHost.provider, gitHost]));
      }
    ),
    jira: connected("jira", jiraIntegration),
    dispatchers: asFunction(
      async ({
        env,
        gitHosts,
      }: {
        env: ApiEnv;
        gitHosts: Promise<GitHosts>;
      }): Promise<Dispatchers> => {
        const dispatchers = [
          ...(env.LOCAL_DISPATCHER_URL
            ? [localDispatcher(env.LOCAL_DISPATCHER_URL)]
            : []),
          ...gitHostEntries(await gitHosts, (host) => host.dispatchers),
        ];

        return new Map(
          dispatchers.map((dispatcher) => [dispatcher.name, dispatcher])
        );
      }
    ),
    triggerEventRegistry: asFunction(
      async (
        services: Parameters<typeof scheduleEvent>[0] &
          Parameters<typeof webhookEvents>[0] & {
            gitHosts: Promise<GitHosts>;
            jira: Promise<JiraIntegration | undefined>;
          }
      ): Promise<TriggerEventRegistry> => {
        const [gitHosts, jira, webhooks] = await Promise.all([
          services.gitHosts,
          services.jira,
          webhookEvents(services),
        ]);

        const definitions = [
          scheduleEvent(services),
          ...gitHostEntries(gitHosts, (host) => host.events),
          ...(jira?.events ?? []),
          ...webhooks,
        ];

        return new Map(
          definitions.map((definition) => [definition.type, definition])
        );
      }
    ),
    eventRegistry: asFunction(
      async (
        services: Parameters<typeof manualEvent>[0] &
          Parameters<typeof taskMessageEvent>[0] & {
            triggerEventRegistry: Promise<TriggerEventRegistry>;
          }
      ): Promise<EventRegistry> => {
        const definitions = [
          ...(await services.triggerEventRegistry).values(),
          manualEvent(services),
          taskMessageEvent(services),
        ];

        return new Map(
          definitions.map((definition) => [definition.type, definition])
        );
      }
    ),
    capabilityRegistry: asFunction(
      async (services: {
        gitHosts: Promise<GitHosts>;
        jira: Promise<JiraIntegration | undefined>;
        mcpServers: Promise<McpServerSelect[]>;
        mcpServerClient: McpServerClient;
      }): Promise<CapabilityRegistry> => {
        const [gitHosts, jira, mcpServers] = await Promise.all([
          services.gitHosts,
          services.jira,
          services.mcpServers,
        ]);

        return new Map(
          [
            ...gitHostEntries(gitHosts, (host) => host.capabilities),
            ...(jira?.capabilities ?? []),
            ...mcpServers.flatMap((server) =>
              mcpServerCapabilities(server, services.mcpServerClient)
            ),
          ].map((definition) => [definition.name, definition])
        );
      }
    ),
    mcpServerClient: asFunction(mcpServerClient),
    effectService: asFunction(effectService),
    taskService: asFunction(taskService),
    taskMachine: asFunction(taskMachine),
    eventFilterService: asFunction(eventFilterService),
    eventProcessOperation: asFunction(eventProcessOperation),
    migrationApplyOperation: asFunction(migrationApplyOperation),
    gitProxyOperation: asFunction(gitProxyOperation),
    modelProxyOperation: asFunction(modelProxyOperation),
    executionListOperation: asFunction(executionListOperation),
    executionMetricsOperation: asFunction(executionMetricsOperation),
    effectMetricsOperation: asFunction(effectMetricsOperation),
    executionMessageCreateOperation: asFunction(
      executionMessageCreateOperation
    ),
    executionMessageListOperation: asFunction(executionMessageListOperation),
    modelProviderResolveOperation: asFunction(modelProviderResolveOperation),
    taskMcpOperation: asFunction(taskMcpOperation),
    agentCreateOperation: asFunction(agentCreateOperation),
    agentDeleteOperation: asFunction(agentDeleteOperation),
    agentInfoOperation: asFunction(agentInfoOperation),
    agentListOperation: asFunction(agentListOperation),
    agentRestoreOperation: asFunction(agentRestoreOperation),
    agentUpdateOperation: asFunction(agentUpdateOperation),
    fixedIpInfoOperation: asFunction(fixedIpInfoOperation),
    mcpServerCreateOperation: asFunction(mcpServerCreateOperation),
    mcpServerDeleteOperation: asFunction(mcpServerDeleteOperation),
    mcpServerInfoOperation: asFunction(mcpServerInfoOperation),
    mcpServerListOperation: asFunction(mcpServerListOperation),
    mcpServerRefreshOperation: asFunction(mcpServerRefreshOperation),
    mcpServerRestoreOperation: asFunction(mcpServerRestoreOperation),
    mcpServerUpdateOperation: asFunction(mcpServerUpdateOperation),
    webhookCreateOperation: asFunction(webhookCreateOperation),
    webhookDeleteOperation: asFunction(webhookDeleteOperation),
    webhookDeliveryOperation: asFunction(webhookDeliveryOperation),
    webhookInfoOperation: asFunction(webhookInfoOperation),
    webhookListOperation: asFunction(webhookListOperation),
    webhookRestoreOperation: asFunction(webhookRestoreOperation),
    webhookUpdateOperation: asFunction(webhookUpdateOperation),
    modelProviderCreateOperation: asFunction(modelProviderCreateOperation),
    modelProviderDeleteOperation: asFunction(modelProviderDeleteOperation),
    modelProviderInfoOperation: asFunction(modelProviderInfoOperation),
    modelProviderListOperation: asFunction(modelProviderListOperation),
    modelProviderRestoreOperation: asFunction(modelProviderRestoreOperation),
    modelProviderUpdateOperation: asFunction(modelProviderUpdateOperation),
    providerCatalogListOperation: asFunction(providerCatalogListOperation),
    connectionCreateOperation: asFunction(connectionCreateOperation),
    connectionDeleteOperation: asFunction(connectionDeleteOperation),
    connectionInfoOperation: asFunction(connectionInfoOperation),
    connectionListOperation: asFunction(connectionListOperation),
    connectionUpdateOperation: asFunction(connectionUpdateOperation),
    defaultsInfoOperation: asFunction(defaultsInfoOperation),
    defaultsUpdateOperation: asFunction(defaultsUpdateOperation),
    networkPolicyInfoOperation: asFunction(networkPolicyInfoOperation),
    networkPolicyUpdateOperation: asFunction(networkPolicyUpdateOperation),
    assistantModel: asFunction(assistantModel),
    assistantInstructions: asFunction(assistantInstructions),
    assistantTools: asFunction(assistantTools),
    conversationListOperation: asFunction(conversationListOperation),
    conversationInfoOperation: asFunction(conversationInfoOperation),
    conversationMessageCreateOperation: asFunction(
      conversationMessageCreateOperation
    ),
    conversationPurgeOperation: asFunction(conversationPurgeOperation),
    automationDeleteOperation: asFunction(automationDeleteOperation),
    automationRestoreOperation: asFunction(automationRestoreOperation),
    automationCreateOperation: asFunction(automationCreateOperation),
    automationListOperation: asFunction(automationListOperation),
    automationInfoOperation: asFunction(automationInfoOperation),
    automationUpdateOperation: asFunction(automationUpdateOperation),
    automationService: asFunction(automationService),
    automationValidator: asFunction(automationValidator),
    taskListOperation: asFunction(taskListOperation),
    taskPurgeOperation: asFunction(taskPurgeOperation),
    taskSessionInfoOperation: asFunction(taskSessionInfoOperation),
    taskSessionUpdateOperation: asFunction(taskSessionUpdateOperation),
    eventListOperation: asFunction(eventListOperation),
    eventCatalogListOperation: asFunction(eventCatalogListOperation),
    capabilityListOperation: asFunction(capabilityListOperation),
    effectListOperation: asFunction(effectListOperation),
    projectListOperation: asFunction(projectListOperation),
    projectCreateOperation: asFunction(projectCreateOperation),
    projectDeleteOperation: asFunction(projectDeleteOperation),
    projectInfoOperation: asFunction(projectInfoOperation),
    projectRestoreOperation: asFunction(projectRestoreOperation),
    projectUpdateOperation: asFunction(projectUpdateOperation),
    projectMemberListOperation: asFunction(projectMemberListOperation),
    projectMemberCreateOperation: asFunction(projectMemberCreateOperation),
    projectMemberUpdateOperation: asFunction(projectMemberUpdateOperation),
    projectMemberDeleteOperation: asFunction(projectMemberDeleteOperation),
    projectRepositoryListOperation: asFunction(projectRepositoryListOperation),
    projectRepositoryCreateOperation: asFunction(
      projectRepositoryCreateOperation
    ),
    projectRepositoryDeleteOperation: asFunction(
      projectRepositoryDeleteOperation
    ),
    repositoryListOperation: asFunction(repositoryListOperation),
    userListOperation: asFunction(userListOperation),
    userUpdateOperation: asFunction(userUpdateOperation),
    githubInstallationOperation: asFunction(githubInstallationOperation),
    gitlabWebhookSync: connected("gitlab", gitlabWebhookSync),
    gitlabSyncOperation: asFunction(gitlabSyncOperation),
    cronDispatch: asFunction(cronDispatch),
    jiraWebhookDispatch: connected("jira", jiraWebhookDispatch),
  });
}

export type ApiContainer = ReturnType<typeof createServices>["cradle"];

// Without request headers, such as for the cron, the scope has no user.
export function createAppContainer(
  deps: Deps,
  executionContext: Pick<ExecutionContext, "waitUntil">,
  headers = new Headers()
) {
  // Work passed to waitUntil can use the scope's services: the scope ends after it.
  const background: Promise<unknown>[] = [];

  const container = createServices(
    deps,
    {
      waitUntil(promise) {
        background.push(promise);
        executionContext.waitUntil(promise);
      },
    },
    headers
  );

  async function dispose() {
    await Promise.allSettled(background);
    await container.dispose();
  }

  async function run<T>(operation: (services: ApiContainer) => Promise<T>) {
    try {
      return await operation(container.cradle);
    } finally {
      await dispose();
    }
  }

  // A streamed Response, such as MCP over SSE, can outlive the handler that returned it.
  // Its request scope belongs to the response stream, not just the fetch promise.
  async function respond(
    operation: (services: ApiContainer) => Promise<Response>
  ) {
    let response: Response;

    try {
      response = await operation(container.cradle);
    } catch (error) {
      executionContext.waitUntil(dispose());
      throw error;
    }

    const { body } = response;

    if (!body) {
      executionContext.waitUntil(dispose());

      return response;
    }

    // The scope ends with the stream, including when the client disconnects.
    const { readable, writable } = new TransformStream();
    executionContext.waitUntil(run(async () => await body.pipeTo(writable)));

    return new Response(readable, response);
  }

  return { run, respond };
}
