import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$projectId/tasks")({
  staticData: { breadcrumb: "Tasks" },
  component: Outlet,
});
