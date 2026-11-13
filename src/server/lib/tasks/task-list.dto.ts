import type { TaskSelect, taskAssociationTable } from "@server/lib/db/schema";
import {
  IdFilter,
  SearchFilter,
  ListOrder,
  TimestampFilter,
  singleOrArray,
} from "@server/lib/pagination/list-filter.dto";
import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import { z } from "zod";

import { TaskStateSchema } from "./task.dto";

export const TaskListRequest = PaginationRequest.extend({
  id: IdFilter.optional(),
  projectId: IdFilter.optional(),
  automationId: IdFilter.optional(),
  search: SearchFilter.optional().describe(
    "Case-insensitive text in the task's ID, its automation's name, or the IDs, titles and labels of its associated resources"
  ),
  state: singleOrArray(TaskStateSchema)
    .optional()
    .describe("States of the task: repeat the parameter for several"),
  createdAt: TimestampFilter.optional(),
  stateChangedAt: TimestampFilter.optional(),
  sort: z
    .enum(["id", "createdAt", "stateChangedAt"])
    .default("stateChangedAt")
    .describe("stateChangedAt is the last change of the task's state"),
  order: ListOrder,
});

export type TaskListRequestDto = z.infer<typeof TaskListRequest>;

export function toResponseDto(
  task: TaskSelect & {
    associations: (typeof taskAssociationTable.$inferSelect)[];
    cost: number;
  }
) {
  return {
    id: task.id,
    automationId: task.automationId,
    state: task.state,
    consecutiveFailures: task.consecutiveFailures,
    createdAt: task.createdAt.toISOString(),
    stateChangedAt: task.stateChangedAt.toISOString(),
    cost: task.cost,
    associations: task.associations.map(
      ({ integration, host, kind, externalId, presentation, createdAt }) => ({
        integration,
        host,
        kind,
        externalId,
        presentation,
        createdAt: createdAt.toISOString(),
      })
    ),
  };
}
