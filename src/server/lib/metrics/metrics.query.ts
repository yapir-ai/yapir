import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { retention } from "@server/lib/tasks/task-retention";
import { gte, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { z } from "zod";

import type { MetricsRequest } from "./metrics.dto";

type Dimensions = Record<string, PgColumn>;

export type MetricsGroup<TDimensions extends Dimensions> = {
  [Dimension in keyof TDimensions]?: string | null;
} & { date?: string };

// The purge keeps every task with an execution in the retention window: the measures of this window are complete.
export const metricsWindow = (createdAt: PgColumn, now: Date) =>
  gte(createdAt, new Date(now.getTime() - retention));

export async function readableProjectFilter(
  db: Db,
  currentUser: CurrentUser,
  projectId: PgColumn
) {
  const projects = await db.query.projectTable.findMany({
    where: await currentUser.readableProjects(),
    columns: { id: true },
  });

  return inArray(
    projectId,
    projects.map(({ id }) => id)
  );
}

export function dimensionFilters<TDimensions extends Dimensions>(
  dimensions: TDimensions,
  filters: Partial<Record<keyof TDimensions, string[]>>
) {
  return Object.entries<string[] | undefined>(filters).flatMap(
    ([dimension, values]) =>
      values ? [inArray(dimensions[dimension]!, values)] : []
  );
}

export function metricsGroups<TDimensions extends Dimensions>(
  dimensions: TDimensions,
  createdAt: PgColumn,
  {
    interval,
    timeZone,
    groupBy = [],
  }: Pick<z.infer<typeof MetricsRequest>, "interval" | "timeZone"> & {
    groupBy?: (keyof TDimensions)[];
  }
) {
  const period = interval
    ? [
        sql<string>`to_char(date_trunc(${interval}, ${createdAt} at time zone ${timeZone}), 'YYYY-MM-DD')`.as(
          "date"
        ),
      ]
    : [];

  const columns: (PgColumn | SQL.Aliased)[] = [
    ...period,
    ...groupBy.map((dimension) => dimensions[dimension]!),
  ];

  const fields: object = Object.fromEntries<PgColumn | SQL.Aliased>([
    ...period.map((date) => ["date", date] as const),
    ...groupBy.map((dimension) => [dimension, dimensions[dimension]!] as const),
  ]);

  return { fields, columns, period };
}
