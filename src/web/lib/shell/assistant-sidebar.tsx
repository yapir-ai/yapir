import { Link, useNavigate } from "@tanstack/react-router";
import { buttonVariants } from "@web/components/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@web/components/ui/sidebar";
import { useCurrentAssistantChat } from "@web/lib/assistant/assistant-chat";
import { AssistantConversationList } from "@web/lib/assistant/assistant-conversation-list";
import { Plus, Settings } from "lucide-react";

export function AssistantSidebar() {
  const { chat, startConversation } = useCurrentAssistantChat();
  const navigate = useNavigate();

  return (
    <>
      <SidebarHeader>
        {/* The page stays mounted on its own URL: the new conversation replaces the current one. */}
        <Link
          to="/assistant"
          onClick={() => startConversation()}
          className={buttonVariants()}
        >
          <Plus />
          New conversation
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AssistantConversationList
            currentId={chat.id}
            onOpen={(conversationId) => {
              void navigate({
                to: "/assistant/$conversationId",
                params: { conversationId },
              });
            }}
          />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/defaults" />}>
              <Settings />
              <span>Defaults</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
