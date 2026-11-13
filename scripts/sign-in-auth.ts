import { sessionAuthOptions } from "@server/lib/auth/auth";
import type { Db } from "@server/lib/db";
import { apiEnvSchema } from "@server/lib/env";
import { betterAuth } from "better-auth/minimal";
import { testUtils } from "better-auth/plugins";

export async function signInAuth(db: Db, env: Record<string, string>) {
  const options = sessionAuthOptions({ db, env: apiEnvSchema.parse(env) });

  const auth = betterAuth({
    ...options,
    session: { ...options.session, expiresIn: 30 * 24 * 60 * 60 },
    plugins: [...options.plugins, testUtils()],
  });

  return {
    ...(await auth.$context).test,
    createApiKey: async (userId: string) =>
      await auth.api.createApiKey({ body: { userId, name: "instance" } }),
  };
}
