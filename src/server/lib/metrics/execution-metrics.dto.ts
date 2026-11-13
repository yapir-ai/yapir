import { ExecutionOutcomeSchema } from "@server/lib/executions/execution.dto";
import { singleOrArray } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

import {
  MetricsGroupBy,
  MetricsRequest,
  sharedMetricsDimensions,
} from "./metrics.dto";

export const executionMetricsDimensions = [
  ...sharedMetricsDimensions,
  "outcome",
] as const;

export const ExecutionMetricsRequest = MetricsRequest.extend({
  groupBy: MetricsGroupBy(executionMetricsDimensions),
  outcome: singleOrArray(ExecutionOutcomeSchema)
    .optional()
    .describe("One or more outcomes: repeat the parameter for several"),
});

export type ExecutionMetricsRequestDto = z.infer<
  typeof ExecutionMetricsRequest
>;
