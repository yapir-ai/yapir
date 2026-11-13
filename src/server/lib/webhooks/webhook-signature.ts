import { createHmac, timingSafeEqual } from "node:crypto";

export const hmacSha256Hex = (secret: string, body: string) =>
  createHmac("sha256", secret).update(body).digest("hex");

// Compares a received secret or signature to the expected one in constant time.
export function isExpectedSecret(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);

  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}
