import {
  IdFilter,
  IdListRequest,
  singleOrArray,
} from "@server/lib/pagination/list-filter.dto";
import { z } from "zod";

import { ExecutionOutcomeSchema } from "./execution.dto";

export const ExecutionListRequest = IdListRequest.extend({
  taskId: IdFilter.optional(),
  projectId: IdFilter.optional(),
  outcome: singleOrArray(ExecutionOutcomeSchema)
    .optional()
    .describe("One or more outcomes: repeat the parameter for several"),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false)
    .describe("Only the executions in progress: they have no outcome yet"),
  latest: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false)
    .describe(
      "Only the latest execution of each task, before the other filters apply"
    ),
});

export type ExecutionListRequestDto = z.infer<typeof ExecutionListRequest>;
