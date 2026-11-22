import {
  BooleanFilter,
  IdFilter,
  IdListRequest,
  singleOrArray,
} from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

import { ExecutionOutcomeSchema } from "./execution.dto";

export const ExecutionListRequest = IdListRequest.extend({
  taskId: IdFilter.optional(),
  projectId: IdFilter.optional(),
  automationId: IdFilter.optional(),
  outcome: singleOrArray(ExecutionOutcomeSchema)
    .optional()
    .describe("One or more outcomes: repeat the parameter for several"),
  active: BooleanFilter.default(false).describe(
    "Only the executions in progress: they have no outcome yet"
  ),
  latest: BooleanFilter.default(false).describe(
    "Only the latest execution of each task, before the other filters apply"
  ),
});

export type ExecutionListRequestDto = z.infer<typeof ExecutionListRequest>;
