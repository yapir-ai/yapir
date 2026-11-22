import {
  OrganizationRoleSchema,
  ProjectRoleSchema,
} from "@server/lib/auth/role.dto";
import type {
  CapabilityGrant,
  Trigger,
} from "@server/lib/automations/automation.dto";
import { ConnectionTypeSchema } from "@server/lib/connections/connection.dto";
import type { ConnectionSettings } from "@server/lib/connections/connection.dto";
import type {
  EventNotificationData,
  ResourcePresentation,
} from "@server/lib/events/event-definition";
import { TaskEventStateSchema } from "@server/lib/events/task-event.dto";
import type { DispatcherName } from "@server/lib/executions/dispatcher.dto";
import { ExecutionOutcomeSchema } from "@server/lib/executions/execution.dto";
import type { HarnessName } from "@server/lib/executions/harness.dto";
import type { McpTool } from "@server/lib/mcp-servers/mcp-server.dto";
import { TaskStateSchema } from "@server/lib/tasks/task.dto";
import { WebhookAuthSchema } from "@server/lib/webhooks/webhook.dto";
import type { UIMessage } from "ai";
import { sql } from "drizzle-orm";
import {
  jsonb,
  boolean,
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

import { encryptedText } from "./encrypted-text";

export const organizationRoleEnum = pgEnum(
  "organization_role",
  OrganizationRoleSchema.enum
);

// Better Auth tables: their properties are the Better Auth field names.
export const userTable = pgTable("user", {
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  role: organizationRoleEnum()
    .notNull()
    .default(OrganizationRoleSchema.enum.User),
});

export type UserSelect = typeof userTable.$inferSelect;

export const sessionTable = pgTable(
  "session",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
  },
  (table) => [index().on(table.userId)]
);

export const accountTable = pgTable(
  "account",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.userId)]
);

export const verificationTable = pgTable(
  "verification",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.identifier)]
);

// Better Auth API key plugin: keys are owned by users.
export const apiKeyTable = pgTable(
  "apikey",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    configId: text("config_id").notNull().default("default"),
    name: text(),
    start: text(),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    prefix: text(),
    key: text().notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at", { withTimezone: true }),
    enabled: boolean().default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").default(0),
    remaining: integer(),
    lastRequest: timestamp("last_request", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .$onUpdate(() => new Date()),
    permissions: text(),
    metadata: text(),
  },
  (table) => [
    index().on(table.configId),
    index().on(table.referenceId),
    index().on(table.key),
  ]
);

export const modelProviderTable = pgTable("model_provider", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  // Its entry in the provider catalog: a models.dev provider ID, which harnesses know.
  catalogId: text("catalog_id").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: encryptedText("api_key").notNull(),
});

export type ModelProviderSelect = typeof modelProviderTable.$inferSelect;

// A remote MCP server whose tools Yapir proxies to agents.
export const mcpServerTable = pgTable("mcp_server", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  slug: text().notNull().unique(),
  url: text().notNull(),
  headerName: text("header_name"),
  headerValue: encryptedText("header_value"),
  fixedIp: boolean("fixed_ip").notNull().default(false),
  // The latest snapshot of its tools.
  tools: jsonb().$type<McpTool[]>().notNull().default([]),
});

export type McpServerSelect = typeof mcpServerTable.$inferSelect;

export const webhookAuthEnum = pgEnum("webhook_auth", WebhookAuthSchema.enum);

// An endpoint whose deliveries trigger automations.
export const webhookTable = pgTable("webhook", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  auth: webhookAuthEnum().notNull(),
  headerName: text("header_name").notNull(),
  secret: encryptedText().notNull(),
  prefix: text(),
  deliveryIdHeader: text("delivery_id_header"),
});

export type WebhookSelect = typeof webhookTable.$inferSelect;

export const connectionTypeEnum = pgEnum(
  "connection_type",
  ConnectionTypeSchema.enum
);

// The organization's access to an external service: at most one per type.
export const connectionTable = pgTable("connection", {
  type: connectionTypeEnum().primaryKey(),
  settings: jsonb().$type<ConnectionSettings>().notNull(),
  // Its secrets as JSON, encrypted as a whole.
  secrets: encryptedText().notNull(),
});

export type ConnectionSelect = typeof connectionTable.$inferSelect;

export const agentTable = pgTable("agent", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  description: text(),
  modelProviderId: uuid("model_provider_id")
    .notNull()
    .references(() => modelProviderTable.id),
  // The model's ID within its model provider.
  model: text().notNull(),
  // The model's reasoning effort; null keeps the model's default.
  effort: text(),
  harness: text().$type<HarnessName>().notNull(),
  prompt: text().notNull(),
  triggers: jsonb().$type<Trigger[]>().notNull().default([]),
  capabilities: jsonb().$type<CapabilityGrant[]>().notNull().default([]),
  // The skills that its executions receive, apart from the deleted ones.
  skillIds: uuid("skill_ids")
    .array()
    .notNull()
    .default(sql`'{}'`),
});

export type AgentSelect = typeof agentTable.$inferSelect;

// Instructions shared with the organization, which users install in their own harness.
export const skillTable = pgTable("skill", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  description: text().notNull(),
  instructions: text().notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => userTable.id),
});

export type SkillSelect = typeof skillTable.$inferSelect;

// The organization's defaults: a single row.
export const defaultsTable = pgTable(
  "defaults",
  {
    id: boolean().primaryKey().default(true),
    modelProviderId: uuid("model_provider_id")
      .notNull()
      .references(() => modelProviderTable.id),
    // The model's ID within its model provider.
    model: text().notNull(),
    // The model's reasoning effort; null keeps the model's default.
    effort: text(),
    harness: text().$type<HarnessName>().notNull().default("opencode"),
  },
  (table) => [check("defaults_single_row", sql`${table.id}`)]
);

export type DefaultsSelect = typeof defaultsTable.$inferSelect;

// The organization's network policy: a single row.
export const networkPolicyTable = pgTable(
  "network_policy",
  {
    id: boolean().primaryKey().default(true),
    enabled: boolean().notNull().default(false),
    includeYapirHosts: boolean("include_yapir_hosts").notNull().default(true),
    hosts: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
  },
  (table) => [check("network_policy_single_row", sql`${table.id}`)]
);

export type NetworkPolicySelect = typeof networkPolicyTable.$inferSelect;

// The last minute the cron ran: each minute runs once, whatever the number of instances.
export const cronTickTable = pgTable(
  "cron_tick",
  {
    id: boolean().primaryKey().default(true),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  },
  (table) => [check("cron_tick_single_row", sql`${table.id}`)]
);

// A user's private exchange with the Assistant.
export const conversationTable = pgTable(
  "conversation",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id),
    // Generated after the first answer.
    title: text(),
    messages: jsonb().$type<UIMessage[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index().on(table.userId, table.id)]
);

export type ConversationSelect = typeof conversationTable.$inferSelect;

export const repositoryProviderEnum = pgEnum("repository_provider", [
  "github",
  "gitlab",
]);

export const repositoryTable = pgTable(
  "repository",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    provider: repositoryProviderEnum().notNull(),
    host: text().notNull(),
    externalId: text("external_id").notNull(),
    path: text().notNull(),
  },
  (table) => [unique().on(table.host, table.externalId)]
);

export type RepositorySelect = typeof repositoryTable.$inferSelect;

export const projectTable = pgTable("project", {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  id: uuid().primaryKey().$defaultFn(uuidv7),
  name: text().notNull(),
  // Markdown that the agents of the project's automations receive after their own instructions.
  instructions: text().notNull().default(""),
  // A repository of the project, the default CI repository of its automations.
  ciRepositoryId: uuid("ci_repository_id").references(() => repositoryTable.id),
});

export type ProjectSelect = typeof projectTable.$inferSelect;

export const projectRepositoryTable = pgTable(
  "project_repository",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositoryTable.id),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.repositoryId] }),
    index().on(table.repositoryId),
  ]
);

export type ProjectRepositorySelect =
  typeof projectRepositoryTable.$inferSelect;

export const projectRoleEnum = pgEnum("project_role", ProjectRoleSchema.enum);

export const projectMemberTable = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: projectRoleEnum().notNull(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
);

export type ProjectMemberSelect = typeof projectMemberTable.$inferSelect;

export const automationTable = pgTable(
  "automation",
  {
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: uuid().primaryKey().$defaultFn(uuidv7),
    name: text().notNull(),
    enabled: boolean().notNull().default(false),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agentTable.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectTable.id),
    // The repository of the project whose CI runs the executions.
    ciRepositoryId: uuid("ci_repository_id"),
    // Markdown that the agent receives after the instructions of its project.
    instructions: text().notNull().default(""),
    triggers: jsonb().$type<Trigger[]>().notNull().default([]),
    capabilities: jsonb().$type<CapabilityGrant[]>().notNull().default([]),
    dispatcher: text().$type<DispatcherName>().notNull(),
  },
  (table) => [
    foreignKey({
      name: "automation_ci_repository_id_fkey",
      columns: [table.projectId, table.ciRepositoryId],
      foreignColumns: [
        projectRepositoryTable.projectId,
        projectRepositoryTable.repositoryId,
      ],
    }),
  ]
);

export type AutomationSelect = typeof automationTable.$inferSelect;

export const taskStateEnum = pgEnum("task_state", TaskStateSchema.enum);

export const taskTable = pgTable(
  "task",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automationTable.id),
    state: taskStateEnum().notNull(),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    // No foreign key: it would close a cycle with execution.task_id.
    activeExecutionId: uuid("active_execution_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    stateChangedAt: timestamp("state_changed_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    unique().on(table.id, table.automationId),
    check(
      "task_active_attempt",
      sql`(${table.state} in ('queued', 'running')) = (${table.activeExecutionId} is not null)`
    ),
  ]
);

export type TaskSelect = typeof taskTable.$inferSelect;

export const executionOutcomeEnum = pgEnum(
  "execution_outcome",
  ExecutionOutcomeSchema.enum
);

export const executionTable = pgTable(
  "execution",
  {
    id: uuid().primaryKey().$defaultFn(uuidv7),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    outcome: executionOutcomeEnum(),
    // Fixed at creation: the release targets the environment the execution was dispatched to.
    dispatcher: text().$type<DispatcherName>().notNull(),
    tokenHash: text("token_hash").unique(),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
    }).notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    stoppedById: uuid("stopped_by_id").references(() => userTable.id),
    error: text(),
    // Fixed at claim: editing the agent does not change the executions it ran.
    agentId: uuid("agent_id").references(() => agentTable.id),
    modelProviderId: uuid("model_provider_id").references(
      () => modelProviderTable.id
    ),
    model: text(),
    effort: text(),
    harness: text().$type<HarnessName>(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    // In USD, null when a model has no price.
    cost: doublePrecision().default(0),
  },
  (table) => [
    index().on(table.taskId, table.queuedAt),
    uniqueIndex("execution_active_task_index")
      .on(table.taskId)
      .where(sql`${table.outcome} is null`),
  ]
);

export type ExecutionSelect = typeof executionTable.$inferSelect;

export const executionMessageTable = pgTable(
  "execution_message",
  {
    id: uuid().primaryKey(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executionTable.id, { onDelete: "cascade" }),
    message: jsonb().$type<UIMessage>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index().on(table.executionId, table.id)]
);

export type ExecutionMessageSelect = typeof executionMessageTable.$inferSelect;

export const taskEventStateEnum = pgEnum(
  "task_event_state",
  TaskEventStateSchema.enum
);

export const taskEventTable = pgTable(
  "task_event",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    notification: jsonb().$type<EventNotificationData>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    state: taskEventStateEnum().notNull().default("pending"),
    executionId: uuid("execution_id").references(() => executionTable.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.eventId] }),
    check(
      "task_event_delivery",
      sql`(${table.state} = 'pending') = (${table.executionId} is null)`
    ),
  ]
);

export const effectTable = pgTable(
  "effect",
  {
    integration: text().notNull(),
    host: text().notNull(),
    kind: text().notNull(),
    externalId: text("external_id").notNull(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automationTable.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => taskTable.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").notNull(),
    agentName: text("agent_name").notNull(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => executionTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    presentation: jsonb().$type<ResourcePresentation>().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.integration, table.host, table.kind, table.externalId],
    }),
    index().on(table.taskId, table.createdAt),
  ]
);

export const taskAssociationTable = pgTable(
  "task_association",
  {
    automationId: uuid("automation_id").notNull(),
    taskId: uuid("task_id").notNull(),
    integration: text().notNull(),
    host: text().notNull(),
    kind: text().notNull(),
    externalId: text("external_id").notNull(),
    presentation: jsonb().$type<ResourcePresentation>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.automationId,
        table.integration,
        table.host,
        table.kind,
        table.externalId,
      ],
    }),
    foreignKey({
      columns: [table.taskId, table.automationId],
      foreignColumns: [taskTable.id, taskTable.automationId],
    }).onDelete("cascade"),
    index().on(table.taskId),
  ]
);
