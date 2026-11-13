import {
  IdFilter,
  IdListRequest,
} from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const ExecutionMessageListRequest = IdListRequest.extend({
  taskId: IdFilter.optional(),
  executionId: IdFilter.optional(),
});

export type ExecutionMessageListRequestDto = z.infer<
  typeof ExecutionMessageListRequest
>;
