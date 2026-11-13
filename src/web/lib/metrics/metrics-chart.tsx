import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@web/components/ui/chart";
import type { ChartConfig } from "@web/components/ui/chart";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { DimensionValue, groupOf } from "./metrics-dimension";
import type { MetricsDimension, MetricsGroupRow } from "./metrics-dimension";
import { windowPeriods } from "./metrics.presentation";
import type { MetricsInterval } from "./metrics.presentation";

// The theme has 5 chart colors: beyond, the smallest groups stack as Other.
const chartColors = 5;

// The API cannot filter the group without a value: it stacks with the remaining groups.
export function chartGroups(groups: (string | null)[]) {
  const named = groups.filter((group) => group !== null);

  return groups.length > chartColors ? named.slice(0, chartColors - 1) : named;
}

function remainderLabel(
  dimension: MetricsDimension | undefined,
  groups: (string | null)[]
) {
  if (!dimension) {
    return "Total";
  }

  if (groups.length > chartColors) {
    return "Other";
  }

  return groups.includes(null) ? (
    <DimensionValue dimension={dimension} value={null} plain />
  ) : undefined;
}

export function MetricsChart<T extends MetricsGroupRow>({
  rows,
  totals,
  groups,
  measure,
  dimension,
  interval,
  format,
  allowDecimals = false,
}: {
  rows: T[];
  totals: T[];
  groups: (string | null)[];
  measure: (row: T) => number;
  dimension?: MetricsDimension;
  interval: MetricsInterval;
  format: (value: number) => string;
  allowDecimals?: boolean;
}) {
  const shown = dimension ? chartGroups(groups) : [];
  const remainder = remainderLabel(dimension, groups);
  const config: ChartConfig = {};

  for (const [index, group] of shown.entries()) {
    config[`s${index}`] = {
      label: <DimensionValue dimension={dimension!} value={group} plain />,
      color: `var(--chart-${index + 1})`,
    };
  }

  // Recharts sorts the legend by data key: the remainder takes the key after the shown groups.
  if (remainder) {
    config[`s${shown.length}`] = {
      label: remainder,
      color: `var(--chart-${shown.length + 1})`,
    };
  }

  const sum = (periodRows: T[]) =>
    periodRows.reduce((total, row) => total + measure(row), 0);

  const data = windowPeriods(interval).map((date) => {
    const periodRows = rows.filter((row) => row.date === date);

    const values = shown.map((group) =>
      sum(periodRows.filter((row) => groupOf(row, dimension) === group))
    );

    const rest =
      sum(totals.filter((row) => row.date === date)) -
      values.reduce((total, value) => total + value, 0);

    return {
      date,
      ...Object.fromEntries(values.map((value, index) => [`s${index}`, value])),
      // The same costs summed in another order differ by a few ulps.
      [`s${shown.length}`]: Math.max(0, Math.round(rest * 1e9) / 1e9),
    };
  });

  const id = useId().replaceAll(/[^a-zA-Z0-9]/gu, "");

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <AreaChart accessibilityLayer data={data}>
        <defs>
          {Object.keys(config).map((series) => (
            <linearGradient
              key={series}
              id={`${id}-${series}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={`var(--color-${series})`}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={`var(--color-${series})`}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(date: string) => dateLabel(date)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width="auto"
          allowDecimals={allowDecimals}
          tickFormatter={(value: number) => format(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(date) => dateLabel(String(date))}
              valueFormatter={format}
            />
          }
        />
        {dimension && <ChartLegend content={<ChartLegendContent />} />}
        {Object.keys(config).map((series) => (
          <Area
            key={series}
            dataKey={series}
            type="monotone"
            stackId="metrics"
            stroke={`var(--color-${series})`}
            fill={`url(#${id}-${series})`}
            fillOpacity={0.4}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

const dateLabel = (date: string) =>
  new Date(`${date}T00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
