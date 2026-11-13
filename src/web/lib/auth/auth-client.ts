import { apiKeyClient } from "@better-auth/api-key/client";
import type { Auth } from "@server/lib/auth/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>(), apiKeyClient()],
});
