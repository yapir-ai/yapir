import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/model-providers")({
  staticData: { breadcrumb: "Model providers" },
  component: Outlet,
});
