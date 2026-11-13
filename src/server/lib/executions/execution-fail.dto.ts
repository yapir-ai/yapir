import { z } from "zod";

// The runner imports this schema at runtime: it must depend only on Zod.
export const ExecutionFailRequest = z.object({
  error: z.string().transform((value) => value.slice(0, 10_000)),
});

export type ExecutionFailRequestDto = z.infer<typeof ExecutionFailRequest>;
