import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agents")({
  staticData: { breadcrumb: "Agents" },
  component: Outlet,
});
