import { client } from "@web/lib/api";
import { collection } from "@web/lib/db/collection";
import { parseResponse } from "hono/client";
import type { InferRequestType, InferResponseType } from "hono/client";

import type {
  EffectMetricsDimension,
  ExecutionMetricsDimension,
  MetricsDimension,
  MetricsGroupRow,
} from "./metrics-dimension";

const api = client.api.metrics;

export type ExecutionMetricsQuery = Omit<
  InferRequestType<typeof api.executions.$get>["query"],
  "groupBy"
> & { groupBy?: ExecutionMetricsDimension[] };

export type EffectMetricsQuery = Omit<
  InferRequestType<typeof api.effects.$get>["query"],
  "groupBy"
> & { groupBy?: EffectMetricsDimension[] };

export type ExecutionMetrics = InferResponseType<
  typeof api.executions.$get,
  200
>["items"][number];

export type EffectMetrics = InferResponseType<
  typeof api.effects.$get,
  200
>["items"][number];

const metricsRowKey = (row: MetricsGroupRow, groupBy: MetricsDimension[]) =>
  JSON.stringify([row.date, ...groupBy.map((dimension) => row[dimension])]);

export function executionMetricsCollection(query: ExecutionMetricsQuery) {
  return collection(`metrics:executions:${JSON.stringify(query)}`, {
    syncMode: "eager",
    queryFn: async ({ signal }) =>
      (
        await parseResponse(
          api.executions.$get({ query }, { init: { signal } })
        )
      ).items,
    getKey: (row) => metricsRowKey(row, query.groupBy ?? []),
  });
}

export function effectMetricsCollection(query: EffectMetricsQuery) {
  return collection(`metrics:effects:${JSON.stringify(query)}`, {
    syncMode: "eager",
    queryFn: async ({ signal }) =>
      (await parseResponse(api.effects.$get({ query }, { init: { signal } })))
        .items,
    getKey: (row) => metricsRowKey(row, query.groupBy ?? []),
  });
}
