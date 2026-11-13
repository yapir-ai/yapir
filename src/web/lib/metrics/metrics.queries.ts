import { query } from "@web/lib/db/query";

import { chartGroups } from "./metrics-chart";
import type {
  EffectMetricsDimension,
  ExecutionMetricsDimension,
} from "./metrics-dimension";
import {
  effectMetricsCollection,
  executionMetricsCollection,
} from "./metrics.collection";
import type {
  EffectMetricsQuery,
  ExecutionMetricsQuery,
} from "./metrics.collection";

export const executionMetricsQuery = (metrics: ExecutionMetricsQuery) =>
  query((q) => q.from({ row: executionMetricsCollection(metrics) }));

export const effectMetricsQuery = (metrics: EffectMetricsQuery) =>
  query((q) => q.from({ row: effectMetricsCollection(metrics) }));

// A chart reads the periods of its largest groups only, and the totals of each period for the remaining ones.
export function executionSeriesQueries(
  metrics: ExecutionMetricsQuery,
  dimension: ExecutionMetricsDimension | undefined,
  groups: (string | null)[]
) {
  const shown = chartGroups(groups);

  return {
    totals: executionMetricsQuery(metrics),
    rows: executionMetricsQuery(
      dimension && shown.length > 0
        ? { ...metrics, groupBy: [dimension], [dimension]: shown }
        : metrics
    ),
  };
}

export function effectSeriesQueries(
  metrics: EffectMetricsQuery,
  dimension: EffectMetricsDimension | undefined,
  groups: (string | null)[]
) {
  const shown = chartGroups(groups);

  return {
    totals: effectMetricsQuery(metrics),
    rows: effectMetricsQuery(
      dimension && shown.length > 0
        ? { ...metrics, groupBy: [dimension], [dimension]: shown }
        : metrics
    ),
  };
}
