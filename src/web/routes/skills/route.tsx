import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/skills")({
  staticData: { breadcrumb: "Skills" },
  component: Outlet,
});
