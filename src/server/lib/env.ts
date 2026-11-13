import { z } from "zod";

export const apiEnvSchema = z.object({
  // Read by the encrypted columns themselves: declared here to be validated with the rest.
  ENCRYPTION_KEY: z.base64(),
  SERVER_URL: z.url(),
  WEBHOOK_URL: z.url().optional(),
  RUNNER_IMAGE: z.string().min(1),
  // Set by `bun dev` only: the endpoint of the local dispatcher, in scripts/local-dispatcher.ts.
  LOCAL_DISPATCHER_URL: z.url().optional(),
  // Development only: each one replaces the API base URL of a forge, to route its calls through a recording proxy.
  GITHUB_API_URL: z.url().optional(),
  GITLAB_API_URL: z.url().optional(),
  JIRA_API_URL: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  OIDC_DISCOVERY_URL: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  ORGANIZATION_ADMIN_EMAILS: z
    .string()
    .transform((emails) => emails.split(",").map((email) => email.trim()))
    .pipe(z.array(z.email())),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
