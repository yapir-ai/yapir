import type { effectTable } from "@server/lib/db/schema";
import { IdFilter, ListOrder } from "@server/lib/pagination/list-filter.dto";
import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import { z } from "zod";

export const EffectListRequest = PaginationRequest.extend({
  taskId: IdFilter.optional(),
  executionId: IdFilter.optional(),
  sort: z.literal("createdAt").default("createdAt"),
  order: ListOrder,
});

export type EffectListRequestDto = z.infer<typeof EffectListRequest>;

export function toResponseDto(effect: typeof effectTable.$inferSelect) {
  return {
    integration: effect.integration,
    host: effect.host,
    kind: effect.kind,
    externalId: effect.externalId,
    taskId: effect.taskId,
    executionId: effect.executionId,
    createdAt: effect.createdAt.toISOString(),
    presentation: effect.presentation,
  };
}
