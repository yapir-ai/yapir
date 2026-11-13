import { defineRelations } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  userTable: {
    sessions: r.many.sessionTable({
      from: r.userTable.id,
      to: r.sessionTable.userId,
    }),
    accounts: r.many.accountTable({
      from: r.userTable.id,
      to: r.accountTable.userId,
    }),
  },
  sessionTable: {
    user: r.one.userTable({
      from: r.sessionTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
  },
  accountTable: {
    user: r.one.userTable({
      from: r.accountTable.userId,
      to: r.userTable.id,
      optional: false,
    }),
  },
  defaultsTable: {
    modelProvider: r.one.modelProviderTable({
      from: r.defaultsTable.modelProviderId,
      to: r.modelProviderTable.id,
      optional: false,
    }),
  },
  projectTable: {
    members: r.many.projectMemberTable({
      from: r.projectTable.id,
      to: r.projectMemberTable.projectId,
    }),
    repositories: r.many.repositoryTable({
      from: r.projectTable.id.through(r.projectRepositoryTable.projectId),
      to: r.repositoryTable.id.through(r.projectRepositoryTable.repositoryId),
    }),
  },
  repositoryTable: {
    projects: r.many.projectTable({
      from: r.repositoryTable.id.through(r.projectRepositoryTable.repositoryId),
      to: r.projectTable.id.through(r.projectRepositoryTable.projectId),
    }),
  },
  agentTable: {
    modelProvider: r.one.modelProviderTable({
      from: r.agentTable.modelProviderId,
      to: r.modelProviderTable.id,
      optional: false,
    }),
  },
  automationTable: {
    project: r.one.projectTable({
      from: r.automationTable.projectId,
      to: r.projectTable.id,
      optional: false,
    }),
    ciRepository: r.one.repositoryTable({
      from: r.automationTable.ciRepositoryId,
      to: r.repositoryTable.id,
    }),
  },
  taskTable: {
    automation: r.one.automationTable({
      from: r.taskTable.automationId,
      to: r.automationTable.id,
      optional: false,
    }),
    associations: r.many.taskAssociationTable({
      from: r.taskTable.id,
      to: r.taskAssociationTable.taskId,
    }),
  },
  executionTable: {
    task: r.one.taskTable({
      from: r.executionTable.taskId,
      to: r.taskTable.id,
      optional: false,
    }),
  },
  executionMessageTable: {
    execution: r.one.executionTable({
      from: r.executionMessageTable.executionId,
      to: r.executionTable.id,
      optional: false,
    }),
  },
  taskEventTable: {
    task: r.one.taskTable({
      from: r.taskEventTable.taskId,
      to: r.taskTable.id,
      optional: false,
    }),
  },
  effectTable: {
    task: r.one.taskTable({
      from: r.effectTable.taskId,
      to: r.taskTable.id,
      optional: false,
    }),
  },
}));

export type Db = NodePgDatabase<typeof relations>;

export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
