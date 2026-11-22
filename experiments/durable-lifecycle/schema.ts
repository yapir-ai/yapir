import { integer, pgTable, text } from "drizzle-orm/pg-core";

import type { End, TaskState } from "./domain";

export const taskTable = pgTable("task", {
  id: text().primaryKey(),
  state: text().$type<TaskState>().notNull(),
  consecutiveFailures: integer().notNull(),
});

export const executionTable = pgTable("execution", {
  id: text().primaryKey(),
  taskId: text().notNull(),
  outcome: text().$type<End["outcome"]>(),
  inputTokens: integer(),
  outputTokens: integer(),
});
