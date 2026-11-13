import { Chat, useChat } from "@ai-sdk/react";
import { useDbClient, useLiveQuery } from "@tanstack/react-db";
import { useLocation, useParams, useRouter } from "@tanstack/react-router";
import { client } from "@web/lib/api";
import { conversationsCollection } from "@web/lib/conversations/conversation.collection";
import { conversationInfoQuery } from "@web/lib/conversations/conversation.queries";
import { DefaultChatTransport, validateUIMessages } from "ai";
import type { UIMessage } from "ai";
import { parseResponse } from "hono/client";
import { createContext, use, useState } from "react";
import type { ReactNode } from "react";
import { v7 as uuidv7 } from "uuid";

import { assistantPageMap } from "./assistant-page-map";

// The server keeps the history: only the new message goes to the conversation's endpoint,
// with the assistant message a new conversation may open with.
const transport = new DefaultChatTransport({
  prepareSendMessagesRequest: ({ id, messages, body }) => ({
    api: `/api/conversations/${id}/messages`,
    body: {
      ...body,
      message: messages.at(-1),
      opening: messages[0]?.role === "assistant" ? messages[0] : undefined,
    },
  }),
  // An HTTP error carries a problem whose detail is meant for the user.
  fetch: async (input, init) => {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { detail } = await response.json<{ detail: string }>();
      throw new Error(detail);
    }

    return response;
  },
});

export function createChat(id = uuidv7(), messages: UIMessage[] = []) {
  return new Chat({ id, messages, transport });
}

export async function loadConversationMessages(conversationId: string) {
  const conversation = await parseResponse(
    client.api.conversations[":conversationId"].$get({
      param: { conversationId },
    })
  );

  // Parsing types the stored messages, whose JSON type is too deep to compare to `UIMessage`.
  return await validateUIMessages({ messages: conversation.messages });
}

const AssistantChatContext = createContext<
  | {
      chat: Chat<UIMessage>;
      setChat: (chat: Chat<UIMessage>) => void;
      startConversation: () => void;
      dockOpen: boolean;
      setDockOpen: (open: boolean) => void;
    }
  | undefined
>(undefined);

export function AssistantChatProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState(() => createChat());
  const [dockOpen, setDockOpen] = useState(false);

  const startConversation = () => setChat(createChat());

  return (
    <AssistantChatContext
      // oxlint-disable-next-line react/jsx-no-constructed-context-values React Compiler memoizes it
      value={{ chat, setChat, startConversation, dockOpen, setDockOpen }}
    >
      {children}
    </AssistantChatContext>
  );
}

export function useCurrentAssistantChat() {
  return use(AssistantChatContext)!;
}

// The server saves a conversation with its first complete answer; it then joins the list and has its page.
export function useConversationSaved(conversationId: string) {
  const { data } = useLiveQuery(conversationInfoQuery(conversationId));

  return data !== undefined;
}

export function useAssistantChat(chat: Chat<UIMessage>) {
  const helpers = useChat({ chat });
  const dbClient = useDbClient();
  const router = useRouter();
  const path = useLocation({ select: (location) => location.pathname });
  const params = useParams({ strict: false });

  async function send(text: string) {
    await helpers.sendMessage(
      { text },
      {
        body: {
          location: { path, params },
          pageMap: assistantPageMap(router),
        },
      }
    );
    await dbClient.collection(conversationsCollection).utils.refetch();
  }

  return { ...helpers, send };
}
