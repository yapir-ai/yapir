import { z } from "zod";

export const ExecutionMessageCreateRequest = z.object({
  id: z.uuidv7(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.looseObject({ type: z.string() })),
});

export type ExecutionMessageCreateRequestDto = z.infer<
  typeof ExecutionMessageCreateRequest
>;
