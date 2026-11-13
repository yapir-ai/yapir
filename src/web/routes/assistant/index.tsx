import { useDbClient } from "@tanstack/react-db";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  createChat,
  useConversationSaved,
  useCurrentAssistantChat,
} from "@web/lib/assistant/assistant-chat";
import { AssistantPage } from "@web/lib/assistant/assistant-page";
import { conversationsCollection } from "@web/lib/conversations/conversation.collection";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { useState } from "react";

export const Route = createFileRoute("/assistant/")({
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(defaultsQuery()),
  staticData: { fullBleed: true },
  component: NewConversationPage,
});

function NewConversationPage() {
  const { chat: current } = useCurrentAssistantChat();
  const dbClient = useDbClient();

  // Entering the page goes on with a new conversation not saved yet, such as one whose first answer is in progress; otherwise it starts a new one.
  // oxlint-disable-next-line react/hook-use-state each visit of the page decides once
  const [entry] = useState(() => ({
    previous: current,
    chat:
      current.messages.length > 0 &&
      !dbClient.collection(conversationsCollection).has(current.id)
        ? current
        : createChat(),
  }));

  // Once the page's conversation is the current one, the page follows it, so a new conversation replaces it.
  const chat = current === entry.previous ? entry.chat : current;
  const saved = useConversationSaved(chat.id);

  return (
    <>
      {saved && (
        <Navigate
          to="/assistant/$conversationId"
          params={{ conversationId: chat.id }}
          replace
        />
      )}
      <AssistantPage chat={chat} />
    </>
  );
}
