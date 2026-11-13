import { z } from "zod";

import { DispatchPayload } from "./dispatch-payload.dto";

export const ExecutionClaimRequest = DispatchPayload.pick({
  executionId: true,
  claimId: true,
}).extend({
  // The CI job's OIDC token.
  identityToken: z.string().optional(),
});

export type ExecutionClaimRequestDto = z.infer<typeof ExecutionClaimRequest>;
