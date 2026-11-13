import { z } from "zod";

export const AutomationExecutionCreateRequest = z.strictObject({
  message: z
    .string()
    .trim()
    .optional()
    .describe("A message to the agent for this execution"),
});

export type AutomationExecutionCreateRequestDto = z.infer<
  typeof AutomationExecutionCreateRequest
>;
