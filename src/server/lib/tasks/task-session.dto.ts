import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import { z } from "zod";

export const TaskSessionUpdateRequest = z.object({
  harness: HarnessNameSchema,
  // The agent writes it, and the user's CLI puts it in a file name and a command.
  sessionId: z.string().regex(/^[\w-]+$/u),
  content: z.string(),
});

export type TaskSessionUpdateRequestDto = z.infer<
  typeof TaskSessionUpdateRequest
>;

export const TaskSessionInfoParams = z.object({ taskId: z.uuid() });

export type TaskSessionInfoParamsDto = z.infer<typeof TaskSessionInfoParams>;

// The latest session of each task, as its harness stores it.
export const taskSessionKey = (taskId: string) => `sessions/${taskId}`;
