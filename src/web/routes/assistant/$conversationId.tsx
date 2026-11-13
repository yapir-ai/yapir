import { createFileRoute } from "@tanstack/react-router";
import {
  createChat,
  loadConversationMessages,
  useCurrentAssistantChat,
} from "@web/lib/assistant/assistant-chat";
import { AssistantPage } from "@web/lib/assistant/assistant-page";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { z } from "zod";

const ConversationRouteParams = z.object({ conversationId: z.uuid() });

export const Route = createFileRoute("/assistant/$conversationId")({
  params: { parse: (params) => ConversationRouteParams.parse(params) },
  // A conversation left and opened again shows its messages of now, not the cached ones.
  gcTime: 0,
  loader: async ({ context, params }) => {
    const [messages] = await Promise.all([
      loadConversationMessages(params.conversationId),
      context.dbClient.preloadLiveQuery(defaultsQuery()),
    ]);

    return messages;
  },
  staticData: { fullBleed: true },
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const messages = Route.useLoaderData();
  const { chat: current } = useCurrentAssistantChat();

  // The current conversation keeps its state, an answer being streamed included.
  const chat =
    current.id === conversationId
      ? current
      : createChat(conversationId, messages);

  return <AssistantPage chat={chat} />;
}
