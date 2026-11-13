import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { taskEventTable } from "@server/lib/db/schema";
import { EmptyFilter, and, eq, inArray, lt, notExists, sql } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { EventRegistry } from "./event-definition";
import type { EventListRequestDto } from "./event-list.dto";
import { toResponseDto } from "./event-list.dto";

export function eventListOperation({
  db,
  currentUser,
  eventRegistry,
}: {
  db: Db;
  currentUser: CurrentUser;
  eventRegistry: Promise<EventRegistry>;
}) {
  async function execute({
    taskId,
    projectId,
    type,
    distinct,
    order,
    offset,
    limit,
  }: EventListRequestDto) {
    const task = {
      id: taskId ? { in: taskId } : EmptyFilter,
      automation: {
        projectId: projectId ? { in: projectId } : EmptyFilter,
        project: await currentUser.readableProjects(),
      },
    } as const;

    const events = await db.query.taskEventTable.findMany({
      where: {
        task,
        AND: [
          {
            RAW: type
              ? (table) => sql`${table.notification}->>'type' = ${type}`
              : EmptyFilter,
          },
          {
            RAW: distinct
              ? (table) =>
                  isFirstAcceptance(
                    table,
                    db.query.taskTable.findMany({
                      columns: { id: true },
                      where: task,
                    })
                  )
              : EmptyFilter,
          },
        ],
      },
      orderBy: { receivedAt: order, eventId: order },
      offset,
      limit,
    });

    const registry = await eventRegistry;

    return {
      items: events.map((event) =>
        toResponseDto(event, registry.get(event.notification.type)!)
      ),
    };
  }

  // An event accepted by several of the listed tasks keeps the acceptance by the task with the lowest ID.
  function isFirstAcceptance(
    acceptance: typeof taskEventTable,
    listedTasks: SQLWrapper
  ) {
    const other = alias(taskEventTable, "other_acceptance");

    return notExists(
      db
        .select()
        .from(other)
        .where(
          and(
            eq(other.eventId, acceptance.eventId),
            lt(other.taskId, acceptance.taskId),
            inArray(other.taskId, listedTasks)
          )
        )
    );
  }

  return { execute };
}

export type EventListOperation = ReturnType<typeof eventListOperation>;
