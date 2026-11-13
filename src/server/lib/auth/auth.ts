import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { OrganizationRoleSchema } from "@server/lib/auth/role.dto";
import type { Db } from "@server/lib/db";
import {
  accountTable,
  apiKeyTable,
  sessionTable,
  userTable,
  verificationTable,
} from "@server/lib/db/schema";
import type { ApiEnv } from "@server/lib/env";
import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions } from "better-auth/minimal";
import { genericOAuth } from "better-auth/plugins";
import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

interface Dependencies {
  db: Db;
  env: ApiEnv;
}

export function sessionAuthOptions({ db, env }: Dependencies) {
  return {
    baseURL: env.SERVER_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: userTable,
        session: sessionTable,
        account: accountTable,
        verification: verificationTable,
        apikey: apiKeyTable,
      },
    }),
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    user: {
      additionalFields: {
        role: {
          type: OrganizationRoleSchema.options,
          defaultValue: OrganizationRoleSchema.enum.User,
          input: false,
        },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Configured Organization Admins are promoted at each sign-in.
          after: async (session) => {
            await db
              .update(userTable)
              .set({ role: OrganizationRoleSchema.enum.Admin })
              .where(
                and(
                  eq(userTable.id, session.userId),
                  inArray(userTable.email, env.ORGANIZATION_ADMIN_EMAILS)
                )
              );
          },
        },
      },
    },
    advanced: { database: { generateId: () => uuidv7() } },
    plugins: [
      // An API key acts as its user's session; the CLI would exceed the default rate limit.
      apiKey({ enableSessionForAPIKeys: true, rateLimit: { enabled: false } }),
    ],
  } satisfies BetterAuthOptions;
}

export function authOptions(dependencies: Dependencies) {
  const options = sessionAuthOptions(dependencies);
  const { env } = dependencies;

  return {
    ...options,
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: "oidc",
            discoveryUrl: env.OIDC_DISCOVERY_URL,
            clientId: env.OIDC_CLIENT_ID,
            clientSecret: env.OIDC_CLIENT_SECRET,
            scopes: ["openid", "email", "profile"],
            overrideUserInfo: true,
          },
        ],
      }),
      ...options.plugins,
    ],
  } satisfies BetterAuthOptions;
}

export function sessionAuth(dependencies: Dependencies) {
  return betterAuth(sessionAuthOptions(dependencies));
}

export function auth(dependencies: Dependencies) {
  return betterAuth(authOptions(dependencies));
}

export type Auth = ReturnType<typeof auth>;

export type SessionAuth = ReturnType<typeof sessionAuth>;
