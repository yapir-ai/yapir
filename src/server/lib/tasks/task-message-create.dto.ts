import { z } from "zod";

export const TaskMessageCreateParams = z.object({ taskId: z.uuid() });

export type TaskMessageCreateParamsDto = z.infer<
  typeof TaskMessageCreateParams
>;

export const TaskMessageCreateRequest = z.strictObject({
  message: z
    .string()
    .trim()
    .min(1)
    .describe("The user's message to the task's agent"),
});

export type TaskMessageCreateRequestDto = z.infer<
  typeof TaskMessageCreateRequest
>;
