import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects")({
  staticData: { breadcrumb: "Projects" },
  component: Outlet,
});
