import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import {
  automationTable,
  executionTable,
  taskTable,
} from "@server/lib/db/schema";
import { and, count, eq, lt, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PgColumn } from "drizzle-orm/pg-core";

import type { ExecutionMetricsRequestDto } from "./execution-metrics.dto";
import {
  dimensionFilters,
  metricsGroups,
  metricsWindow,
  readableProjectFilter,
} from "./metrics.query";
import type { MetricsGroup } from "./metrics.query";

const dimensions = {
  projectId: automationTable.projectId,
  automationId: taskTable.automationId,
  agentId: executionTable.agentId,
  modelProviderId: executionTable.modelProviderId,
  model: executionTable.model,
  harness: executionTable.harness,
  outcome: executionTable.outcome,
};

const earlierExecution = alias(executionTable, "earlier_execution");

const total = (column: PgColumn) =>
  sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);

export function executionMetricsOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  const measures = {
    executions: count(),
    startedTasks: count(
      sql`case when ${notExists(
        db
          .select({ id: earlierExecution.id })
          .from(earlierExecution)
          .where(
            and(
              eq(earlierExecution.taskId, executionTable.taskId),
              lt(earlierExecution.id, executionTable.id)
            )
          )
      )} then 1 end`
    ),
    succeededExecutions: count(
      sql`case when ${executionTable.outcome} = 'succeeded' then 1 end`
    ),
    failedExecutions: count(
      sql`case when ${executionTable.outcome} = 'failed' then 1 end`
    ),
    // In USD, apart from the executions of models without a price.
    cost: total(executionTable.cost),
    inputTokens: total(executionTable.inputTokens),
    outputTokens: total(executionTable.outputTokens),
    cacheReadTokens: total(executionTable.cacheReadTokens),
    cacheWriteTokens: total(executionTable.cacheWriteTokens),
    // In milliseconds, over the ended executions.
    averageDuration: sql<
      number | null
    >`avg(extract(epoch from ${executionTable.endedAt} - ${executionTable.startedAt}) * 1000)`.mapWith(
      Number
    ),
  };

  async function execute({
    interval,
    timeZone,
    groupBy,
    ...filters
  }: ExecutionMetricsRequestDto) {
    const { fields, columns, period } = metricsGroups(
      dimensions,
      executionTable.queuedAt,
      { interval, timeZone, groupBy }
    );

    const items = await db
      .select({ ...fields, ...measures })
      .from(executionTable)
      .innerJoin(taskTable, eq(taskTable.id, executionTable.taskId))
      .innerJoin(
        automationTable,
        eq(automationTable.id, taskTable.automationId)
      )
      .where(
        and(
          metricsWindow(executionTable.queuedAt, clock.now),
          await readableProjectFilter(
            db,
            currentUser,
            automationTable.projectId
          ),
          ...dimensionFilters(dimensions, filters)
        )
      )
      .groupBy(...columns)
      .orderBy(...period);

    return {
      // SAFETY: the fields hold the requested dimensions, and the date with an interval.
      items: items as (MetricsGroup<typeof dimensions> &
        (typeof items)[number])[],
    };
  }

  return { execute };
}
