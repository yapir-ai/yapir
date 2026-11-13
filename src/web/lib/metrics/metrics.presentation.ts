import type { MetricsIntervalSchema } from "@server/lib/metrics/metrics.dto";
import { retention } from "@server/lib/tasks/task-retention";
import type { z } from "zod";

import type { ExecutionMetrics } from "./metrics.collection";

export type MetricsInterval = z.infer<typeof MetricsIntervalSchema>;

export const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const localDate = (date: Date) => date.toLocaleDateString("en-CA");

export function windowPeriods(interval: MetricsInterval) {
  const day = new Date(Date.now() - retention);
  day.setHours(0, 0, 0, 0);

  if (interval === "week") {
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  }

  const periods: string[] = [];

  for (
    ;
    day.getTime() <= Date.now();
    day.setDate(day.getDate() + (interval === "week" ? 7 : 1))
  ) {
    periods.push(localDate(day));
  }

  return periods;
}

export const failureRate = ({
  succeededExecutions,
  failedExecutions,
}: Pick<ExecutionMetrics, "succeededExecutions" | "failedExecutions">) =>
  succeededExecutions + failedExecutions === 0
    ? null
    : failedExecutions / (succeededExecutions + failedExecutions);

const percent = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const rateLabel = (rate: number | null) =>
  rate === null ? "—" : percent.format(rate);
