import type { QueryClient } from "@tanstack/query-core";
import type { DbClient } from "@tanstack/react-db";
import { createRootRouteWithContext, redirect } from "@tanstack/react-router";
import { authClient } from "@web/lib/auth/auth-client";
import { sessionQuery } from "@web/lib/auth/session";
import { AppLayout } from "@web/lib/shell/app-layout";

export const Route = createRootRouteWithContext<{
  dbClient: DbClient;
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.query({
      ...sessionQuery,
      staleTime: "static",
    });

    if (!session) {
      const { url } = await authClient.signIn.social({
        provider: "oidc",
        callbackURL: location.href,
        disableRedirect: true,
        fetchOptions: { throw: true },
      });

      throw redirect({ href: url });
    }

    return { session };
  },
  component: AppLayout,
});
