import { useRouteContext } from "@tanstack/react-router";

import { authClient } from "./auth-client";

export const sessionQuery = {
  queryKey: ["session"],
  queryFn: async () =>
    await authClient.getSession({ fetchOptions: { throw: true } }),
};

export function useSessionUser() {
  return useRouteContext({
    from: "__root__",
    select: (context) => context.session.user,
  });
}
