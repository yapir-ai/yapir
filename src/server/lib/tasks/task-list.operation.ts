import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { executionTable } from "@server/lib/db/schema";
import { EmptyFilter, asc, desc, inArray, sql } from "drizzle-orm";

import type { TaskListRequestDto } from "./task-list.dto";
import { toResponseDto } from "./task-list.dto";

export function taskListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(request: TaskListRequestDto) {
    const tasks = await findTasks(request);

    return { items: tasks.map(toResponseDto) };
  }

  async function findTasks({
    id,
    projectId,
    automationId,
    search,
    state,
    createdAt,
    stateChangedAt,
    sort,
    order,
    offset,
    limit,
  }: TaskListRequestDto) {
    return await db.query.taskTable.findMany({
      extras: {
        cost: (table) =>
          sql<number>`(select coalesce(sum(${executionTable.cost}), 0) from ${executionTable} where ${executionTable.taskId} = ${table.id})`,
      },
      with: {
        associations: {
          // The first association is the resource that started the Task.
          orderBy: { createdAt: "asc", kind: "asc", externalId: "asc" },
        },
      },
      where: {
        id: id ? { in: id } : EmptyFilter,
        automationId: automationId ? { in: automationId } : EmptyFilter,
        state: state ? { in: state } : EmptyFilter,
        automation: {
          projectId: projectId ? { in: projectId } : EmptyFilter,
          project: await currentUser.readableProjects(),
        },
        AND: [
          {
            RAW: createdAt
              ? (table) =>
                  inArray(
                    sql`date_trunc('milliseconds', ${table.createdAt})`,
                    createdAt.map((time) => new Date(time))
                  )
              : EmptyFilter,
          },
          {
            RAW: stateChangedAt
              ? (table) =>
                  inArray(
                    sql`date_trunc('milliseconds', ${table.stateChangedAt})`,
                    stateChangedAt.map((time) => new Date(time))
                  )
              : EmptyFilter,
          },
        ],
        OR: search
          ? [
              {
                RAW: (table) =>
                  sql`strpos(lower(${table.id}::text), lower(${search})) > 0`,
              },
              {
                automation: {
                  RAW: (table) =>
                    sql`strpos(lower(${table.name}), lower(${search})) > 0`,
                },
              },
              {
                associations: {
                  RAW: (table) =>
                    sql`strpos(lower(concat_ws(' ', ${table.externalId}, ${table.presentation}->>'title', ${table.presentation}->>'label')), lower(${search})) > 0`,
                },
              },
            ]
          : EmptyFilter,
      },
      orderBy: (table) => {
        const direction = order === "asc" ? asc : desc;

        return sort === "id"
          ? [direction(table.id)]
          : [
              direction(sql`date_trunc('milliseconds', ${table[sort]})`),
              desc(table.id),
            ];
      },
      offset,
      limit,
    });
  }

  return { execute };
}
