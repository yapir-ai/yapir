import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useNavigate } from "@tanstack/react-router";
import { MessageComposer } from "@web/components/message-composer";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { useState } from "react";

import {
  createChat,
  useAssistantChat,
  useCurrentAssistantChat,
} from "./assistant-chat";
import { AssistantSuggestions } from "./assistant-conversation";

export function AssistantPrompt() {
  const { data: defaults } = useLiveSuspenseQuery(defaultsQuery());

  return defaults?.modelProviderId ? <NewConversationPrompt /> : null;
}

function NewConversationPrompt() {
  const { setChat } = useCurrentAssistantChat();
  const navigate = useNavigate();
  // oxlint-disable-next-line react/hook-use-state the prompt starts one conversation
  const [chat] = useState(() => createChat());
  const { send } = useAssistantChat(chat);

  async function ask(text: string) {
    const answer = send(text);
    setChat(chat);
    await navigate({ to: "/assistant" });
    await answer;
  }

  return (
    <div className="grid gap-3">
      <MessageComposer placeholder="Ask the Assistant" onSend={ask} />
      <AssistantSuggestions onSend={ask} />
    </div>
  );
}
