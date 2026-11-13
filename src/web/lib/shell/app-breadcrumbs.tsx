import { Link, useMatches } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@web/components/ui/breadcrumb";
import { createContext, Fragment, isValidElement, use } from "react";
import type { ReactElement } from "react";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    breadcrumb?: string | ReactElement;
  }
}

const PageTitleContext = createContext(false);

export function AppBreadcrumbs() {
  const matches = useMatches();

  const crumbs = matches.flatMap((match) =>
    match.staticData.breadcrumb
      ? [{ pathname: match.pathname, label: match.staticData.breadcrumb }]
      : []
  );

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const label = isValidElement(crumb.label) ? (
            crumb.label
          ) : (
            <BreadcrumbLabel>{crumb.label}</BreadcrumbLabel>
          );

          return (
            <Fragment key={crumb.pathname}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem
                className={index === crumbs.length - 1 ? "min-w-0" : "shrink-0"}
              >
                {index === crumbs.length - 1 ? (
                  <BreadcrumbPage>
                    <PageTitleContext value={crumb.pathname !== "/"}>
                      {label}
                    </PageTitleContext>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.pathname} />}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function BreadcrumbLabel({ children }: { children: string }) {
  const isPageTitle = use(PageTitleContext);

  return (
    <>
      {isPageTitle && <title>{`Yapir · ${children}`}</title>}
      {children}
    </>
  );
}
