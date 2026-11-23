import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { Fields, JsonObject, Step } from "./storage.types";

export const workflowTable = pgTable(
  "workflow",
  {
    id: uuid().primaryKey(),
    type: text().notNull(),
    rootId: uuid("root_id")
      .notNull()
      .references((): AnyPgColumn => workflowTable.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    fields: jsonb().$type<Fields>().notNull(),
    journal: jsonb().$type<Step[]>().notNull(),
    result: jsonb().$type<JsonObject>(),
    wakeAt: timestamp("wake_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index().on(table.rootId),
    index()
      .on(table.wakeAt)
      .where(sql`${table.wakeAt} is not null`),
  ]
);

export type WorkflowSelect = typeof workflowTable.$inferSelect;
