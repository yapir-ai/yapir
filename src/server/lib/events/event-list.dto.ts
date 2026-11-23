import type { taskEventTable } from "@server/lib/db/schema";
import { IdFilter, ListOrder } from "@server/lib/pagination/list-filter.dto";
import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import { z } from "zod";

import type { EventDefinition } from "./event-definition";

export const EventListRequest = PaginationRequest.extend({
  taskId: IdFilter.optional(),
  projectId: IdFilter.optional(),
  automationId: IdFilter.optional(),
  type: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Event type, from the event catalog"),
  distinct: z
    .literal("eventId")
    .optional()
    .describe("One item per event, even when several tasks accepted it"),
  order: ListOrder,
});

export type EventListRequestDto = z.infer<typeof EventListRequest>;

export function toResponseDto(
  event: typeof taskEventTable.$inferSelect,
  definition: EventDefinition
) {
  // What a trigger's CEL expression evaluates as `event`. Its recursive JSON type is too deep for the web's typed collections.
  const data: unknown = event.notification.data;

  return {
    taskId: event.taskId,
    eventId: event.eventId,
    type: event.notification.type,
    receivedAt: event.receivedAt.toISOString(),
    state: event.state,
    executionId: event.executionId,
    label: definition.label,
    presentation: definition.present(
      event.notification.data,
      event.notification.author
    ),
    data,
  };
}
