import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import {
  IdFilter,
  singleOrArray,
} from "@server/lib/pagination/list-filter.dto";
import { z } from "zod";

export const sharedMetricsDimensions = [
  "projectId",
  "automationId",
  "agentId",
  "modelProviderId",
  "model",
  "harness",
] as const;

export const MetricsIntervalSchema = z.enum(["day", "week"]);

export const StringFilter = singleOrArray(z.string()).describe(
  "One or more values: repeat the parameter for several"
);

export const MetricsRequest = z.object({
  interval: MetricsIntervalSchema.optional().describe(
    "Splits the measures by period, each row holding its `date`; without it, the measures are totals"
  ),
  timeZone: z
    .string()
    .refine(
      isTimeZone,
      "Unknown time zone: use an IANA name, such as Europe/Paris"
    )
    .default("UTC")
    .describe("The IANA time zone in which periods start"),
  projectId: IdFilter.optional(),
  automationId: IdFilter.optional(),
  agentId: IdFilter.optional(),
  modelProviderId: IdFilter.optional(),
  model: StringFilter.optional(),
  harness: singleOrArray(HarnessNameSchema)
    .optional()
    .describe("One or more harnesses: repeat the parameter for several"),
});

export const MetricsGroupBy = <T extends string>(dimensions: readonly T[]) =>
  singleOrArray(z.enum(dimensions))
    .optional()
    .describe(
      "One or more dimensions: each row holds one combination of their values"
    );

// Intl.supportedValuesOf lists neither UTC nor the current names of renamed zones, such as Asia/Kolkata.
// Intl reads an offset, such as +02:00, as ISO 8601, and Postgres as POSIX, with the opposite sign.
function isTimeZone(timeZone: string) {
  if (/^[+-]/u.test(timeZone)) {
    return false;
  }

  try {
    return Boolean(new Intl.DateTimeFormat("en", { timeZone }));
  } catch {
    return false;
  }
}
