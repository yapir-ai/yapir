import type { RegisteredRouter } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    // One line telling the Assistant what the page is for. Only described pages appear in its page map.
    description?: string;
  }
}

type RoutesByPath = RegisteredRouter["routesByPath"];

export function assistantPageMap(router: RegisteredRouter) {
  // A mapped type lets `Object.values` infer the routes, which an interface hides.
  const routes: { [Path in keyof RoutesByPath]: RoutesByPath[Path] } =
    router.routesByPath;

  return Object.values(routes).flatMap(({ to, options: { staticData } }) =>
    staticData?.description
      ? [{ path: to, description: staticData.description }]
      : []
  );
}

export function isRoutePath(router: RegisteredRouter, path: string) {
  const [, params, route] = router.getMatchedRoutes(path);

  return Boolean(route) && !params["**"];
}
