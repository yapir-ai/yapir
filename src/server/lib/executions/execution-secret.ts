import { createHash, randomBytes } from "node:crypto";

// Claim IDs and execution tokens have high entropy: a fast hash is enough.
export const createSecret = () => randomBytes(32).toString("base64url");

export const hashSecret = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");
