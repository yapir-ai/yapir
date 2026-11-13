import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect } from "react";

import { useCurrentAssistantChat } from "./assistant-chat";
import { AssistantConversation } from "./assistant-conversation";

export function AssistantPage({ chat }: { chat: Chat<UIMessage> }) {
  const { setChat } = useCurrentAssistantChat();

  useEffect(() => setChat(chat), [chat, setChat]);

  return (
    <div className="mx-auto flex max-h-[calc(100svh-var(--app-header-height))] min-h-0 w-full max-w-3xl flex-1 flex-col p-4">
      <AssistantConversation chat={chat} />
    </div>
  );
}
