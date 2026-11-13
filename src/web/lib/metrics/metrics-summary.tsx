import { useDbClient, useLiveSuspenseQuery } from "@tanstack/react-db";
import type { LiveQueryOptions } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@web/components/ui/button";
import { Stat, StatList } from "@web/components/ui/stat";
import { SectionCard } from "@web/lib/metrics/section-card";
import { changeRequestKinds, commentKinds } from "@web/lib/tasks/effect-kind";
import { costLabel } from "@web/lib/tasks/task.presentation";
import { Suspense } from "react";

import { MetricsChart } from "./metrics-chart";
import { rankGroups } from "./metrics-dimension";
import type { ExecutionMetricsDimension } from "./metrics-dimension";
import type { ExecutionMetricsQuery } from "./metrics.collection";
import { browserTimeZone } from "./metrics.presentation";
import {
  effectMetricsQuery,
  executionMetricsQuery,
  executionSeriesQueries,
} from "./metrics.queries";
import type { MetricsFilters } from "./metrics.route";

export function MetricsSummary({ filters }: { filters: MetricsFilters }) {
  return (
    <SectionCard
      title="Last 30 days"
      action={<MetricsLink filters={filters} />}
    >
      <Suspense>
        <MetricsStats filters={filters} />
      </Suspense>
    </SectionCard>
  );
}

export function CostSummary({
  filters,
  groupBy,
}: {
  filters: MetricsFilters;
  groupBy: ExecutionMetricsDimension;
}) {
  return (
    <Suspense>
      <CostCard filters={filters} groupBy={groupBy} />
    </Suspense>
  );
}

const groupTotalsQuery = (
  filters: MetricsFilters,
  groupBy: ExecutionMetricsDimension
) => executionMetricsQuery({ ...filters, groupBy: [groupBy] });

const dailyMetrics = (filters: MetricsFilters): ExecutionMetricsQuery => ({
  ...filters,
  interval: "day",
  timeZone: browserTimeZone,
});

export function usePreloadCostMetrics(
  filters: MetricsFilters,
  groupBy: ExecutionMetricsDimension
) {
  usePreloadMetrics(
    groupTotalsQuery(filters, groupBy),
    executionMetricsQuery(dailyMetrics(filters))
  );
}

function usePreloadMetrics(...queries: LiveQueryOptions[]) {
  const dbClient = useDbClient();

  for (const options of queries) {
    void dbClient.preloadLiveQuery(options);
  }
}

function CostCard({
  filters,
  groupBy,
}: {
  filters: MetricsFilters;
  groupBy: ExecutionMetricsDimension;
}) {
  usePreloadCostMetrics(filters, groupBy);

  const totals = useLiveSuspenseQuery(executionMetricsQuery(filters)).data[0]!;

  if (totals.executions === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Cost"
      action={<MetricsLink filters={filters} groupBy={groupBy} />}
    >
      <div className="grid gap-6">
        <StatList>
          <Stat label="Last 30 days">{costLabel(totals.cost)}</Stat>
        </StatList>
        <CostChart filters={filters} groupBy={groupBy} />
      </div>
    </SectionCard>
  );
}

function MetricsLink({
  filters,
  groupBy,
}: {
  filters: MetricsFilters;
  groupBy?: ExecutionMetricsDimension;
}) {
  return (
    <Link
      to="/metrics"
      search={{ ...filters, groupBy }}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      View metrics
    </Link>
  );
}

function MetricsStats({ filters }: { filters: MetricsFilters }) {
  usePreloadMetrics(effectMetricsQuery({ ...filters, groupBy: ["kind"] }));

  const totals = useLiveSuspenseQuery(executionMetricsQuery(filters)).data[0]!;

  const { data: byKind } = useLiveSuspenseQuery(
    effectMetricsQuery({ ...filters, groupBy: ["kind"] })
  );

  const effectsOf = (kinds: string[]) =>
    byKind
      .filter((row) => kinds.includes(row.kind!))
      .reduce((total, row) => total + row.effects, 0);

  return (
    <StatList>
      <Stat label="Cost">{costLabel(totals.cost)}</Stat>
      <Stat label="Executions">{totals.executions}</Stat>
      <Stat
        label="Change requests"
        description="The pull requests and merge requests that agents opened."
      >
        {effectsOf(changeRequestKinds)}
      </Stat>
      <Stat label="Comments">{effectsOf(commentKinds)}</Stat>
    </StatList>
  );
}

function CostChart({
  filters,
  groupBy,
}: {
  filters: MetricsFilters;
  groupBy: ExecutionMetricsDimension;
}) {
  const { data: totals } = useLiveSuspenseQuery(
    groupTotalsQuery(filters, groupBy)
  );

  const groups = rankGroups(groupBy, totals, []);
  const series = executionSeriesQueries(dailyMetrics(filters), groupBy, groups);

  const { data: rows } = useLiveSuspenseQuery(series.rows);
  const { data: periods } = useLiveSuspenseQuery(series.totals);

  return (
    <MetricsChart
      rows={rows}
      totals={periods}
      groups={groups}
      measure={(row) => row.cost}
      dimension={groupBy}
      interval="day"
      format={costLabel}
      allowDecimals
    />
  );
}
