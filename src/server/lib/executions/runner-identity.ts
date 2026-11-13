import { unauthorized } from "@server/lib/errors/error.factory";
import { verifyWithJwks } from "hono/jwt";

export async function verifyRunnerIdentity(
  identityToken: string | undefined,
  {
    issuer,
    jwksUri,
    audience,
    claims,
  }: {
    issuer: string;
    jwksUri: string;
    audience: string;
    claims: Record<string, string>;
  }
) {
  if (identityToken === undefined) {
    throw unauthorized("RUNNER_IDENTITY_INVALID");
  }

  const payload = await verifyWithJwks(identityToken, {
    jwks_uri: jwksUri,
    verification: { iss: issuer, aud: audience },
    allowedAlgorithms: ["RS256"],
    // Hono throws one error class per failed check.
  }).catch(() => {
    throw unauthorized("RUNNER_IDENTITY_INVALID");
  });

  if (Object.entries(claims).some(([name, value]) => payload[name] !== value)) {
    throw unauthorized("RUNNER_IDENTITY_INVALID");
  }
}
