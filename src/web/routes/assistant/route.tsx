import { createFileRoute, Outlet } from "@tanstack/react-router";
import { conversationListQuery } from "@web/lib/conversations/conversation.queries";
import { AssistantSidebar } from "@web/lib/shell/assistant-sidebar";

export const Route = createFileRoute("/assistant")({
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(conversationListQuery()),
  staticData: { breadcrumb: "Assistant", sidebar: <AssistantSidebar /> },
  component: Outlet,
});
