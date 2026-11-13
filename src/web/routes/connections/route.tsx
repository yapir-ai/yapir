import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/connections")({
  staticData: { breadcrumb: "Connections" },
  component: Outlet,
});
