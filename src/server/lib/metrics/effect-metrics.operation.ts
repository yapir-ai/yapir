import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import {
  automationTable,
  effectTable,
  executionTable,
} from "@server/lib/db/schema";
import { and, count, eq } from "drizzle-orm";

import type { EffectMetricsRequestDto } from "./effect-metrics.dto";
import {
  dimensionFilters,
  metricsGroups,
  metricsWindow,
  readableProjectFilter,
} from "./metrics.query";
import type { MetricsGroup } from "./metrics.query";

const dimensions = {
  projectId: automationTable.projectId,
  automationId: effectTable.automationId,
  agentId: effectTable.agentId,
  modelProviderId: executionTable.modelProviderId,
  model: executionTable.model,
  harness: executionTable.harness,
  kind: effectTable.kind,
};

export function effectMetricsOperation({
  db,
  clock,
  currentUser,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
}) {
  async function execute({
    interval,
    timeZone,
    groupBy,
    ...filters
  }: EffectMetricsRequestDto) {
    const { fields, columns, period } = metricsGroups(
      dimensions,
      effectTable.createdAt,
      { interval, timeZone, groupBy }
    );

    const items = await db
      .select({ ...fields, effects: count() })
      .from(effectTable)
      .innerJoin(executionTable, eq(executionTable.id, effectTable.executionId))
      .innerJoin(
        automationTable,
        eq(automationTable.id, effectTable.automationId)
      )
      .where(
        and(
          metricsWindow(effectTable.createdAt, clock.now),
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
