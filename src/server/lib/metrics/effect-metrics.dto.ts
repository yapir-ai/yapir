import type { z } from "zod";

import {
  MetricsGroupBy,
  MetricsRequest,
  StringFilter,
  sharedMetricsDimensions,
} from "./metrics.dto";

export const effectMetricsDimensions = [
  ...sharedMetricsDimensions,
  "kind",
] as const;

export const EffectMetricsRequest = MetricsRequest.extend({
  groupBy: MetricsGroupBy(effectMetricsDimensions),
  kind: StringFilter.optional().describe(
    "One or more resource kinds, such as `issue` (a GitHub pull request), `merge_request`, `commit` or `issue_comment`: repeat the parameter for several"
  ),
});

export type EffectMetricsRequestDto = z.infer<typeof EffectMetricsRequest>;
