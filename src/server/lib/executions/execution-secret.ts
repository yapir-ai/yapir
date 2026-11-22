import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { ApiEnv } from "@server/lib/env";

// Execution tokens have high entropy: a fast hash is enough.
export const createSecret = () => randomBytes(32).toString("base64url");

export const hashSecret = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");

export const deriveClaimId = (
  executionId: string,
  { ENCRYPTION_KEY }: Pick<ApiEnv, "ENCRYPTION_KEY">
) =>
  createHmac("sha256", Buffer.from(ENCRYPTION_KEY, "base64"))
    .update(`execution-claim:${executionId}`)
    .digest("base64url");

export function isClaimId(
  claimId: string,
  executionId: string,
  env: Pick<ApiEnv, "ENCRYPTION_KEY">
) {
  const presented = Buffer.from(claimId);
  const expected = Buffer.from(deriveClaimId(executionId, env));

  return (
    presented.length === expected.length && timingSafeEqual(presented, expected)
  );
}
