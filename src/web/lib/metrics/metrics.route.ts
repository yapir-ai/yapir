import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { MetricsIntervalSchema } from "@server/lib/metrics/metrics.dto";
import { z } from "zod";

import { metricsDimensions } from "./metrics-dimension";

export const MetricsRouteSearch = z.object({
  projectId: z.uuid().optional(),
  automationId: z.uuid().optional(),
  agentId: z.uuid().optional(),
  modelProviderId: z.uuid().optional(),
  model: z.string().optional(),
  harness: HarnessNameSchema.optional(),
  groupBy: z.enum(metricsDimensions).optional(),
  interval: MetricsIntervalSchema.default("day"),
});

export type MetricsSearch = z.infer<typeof MetricsRouteSearch>;

export type MetricsFilters = Omit<
  z.input<typeof MetricsRouteSearch>,
  "groupBy" | "interval"
>;
