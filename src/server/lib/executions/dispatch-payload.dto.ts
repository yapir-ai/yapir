import { z } from "zod";

// The runner imports this schema at runtime: it must depend only on Zod.
export const DispatchPayload = z.object({
  executionId: z.uuid(),
  claimId: z.string().min(1),
  // Identifies the task's state, which the execution environment keeps across its executions.
  cacheKey: z.string().min(1),
  serverUrl: z.url(),
  // The runner image of this server's version, which the CI execution environments run.
  image: z.string().min(1),
});

export type DispatchPayloadDto = z.infer<typeof DispatchPayload>;
