import type { Transaction } from "@server/lib/db";
import { taskEventTable } from "@server/lib/db/schema";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { PreparedEvent } from "@server/lib/events/event-definition";
import { and, eq } from "drizzle-orm";

import type { LockedTask } from "./command";

type Attempt = Pick<ExecutionSelect, "id" | "taskId">;

export async function receiveEvent(
  tx: Transaction,
  task: Pick<LockedTask, "id">,
  event: PreparedEvent,
  now: Date
) {
  const received = await tx
    .insert(taskEventTable)
    .values({
      taskId: task.id,
      eventId: event.id,
      receivedAt: now,
      notification: {
        type: event.type,
        data: event.data,
        author: event.author,
      },
    })
    .onConflictDoNothing()
    .returning({ eventId: taskEventTable.eventId });

  return received.length > 0;
}

export async function deliverPendingEvents(tx: Transaction, attempt: Attempt) {
  const delivered = await tx
    .update(taskEventTable)
    .set({ state: "delivered", executionId: attempt.id })
    .where(
      and(
        eq(taskEventTable.taskId, attempt.taskId),
        eq(taskEventTable.state, "pending")
      )
    )
    .returning();

  return delivered
    .toSorted((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
    .map(({ notification }) => notification);
}

export async function acknowledgeTurnEvents(tx: Transaction, attempt: Attempt) {
  await tx
    .update(taskEventTable)
    .set({ state: "acknowledged" })
    .where(turnEvents(attempt));
}

export async function returnTurnEvents(tx: Transaction, attempt: Attempt) {
  await tx
    .update(taskEventTable)
    .set({ state: "pending", executionId: null })
    .where(turnEvents(attempt));
}

export async function hasPendingEvents(
  tx: Transaction,
  task: Pick<LockedTask, "id">
) {
  const pending = await tx.query.taskEventTable.findFirst({
    columns: { eventId: true },
    where: { taskId: task.id, state: "pending" },
  });

  return pending !== undefined;
}

const turnEvents = (attempt: Attempt) =>
  and(
    eq(taskEventTable.taskId, attempt.taskId),
    eq(taskEventTable.executionId, attempt.id),
    eq(taskEventTable.state, "delivered")
  );
