import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@web/components/ui/empty";
import { conversationListQuery } from "@web/lib/conversations/conversation.queries";

export function AssistantConversationList({
  currentId,
  onOpen,
}: {
  currentId: string;
  onOpen: (conversationId: string) => void;
}) {
  const { data: conversations } = useLiveSuspenseQuery(conversationListQuery());

  return (
    <nav
      aria-label="Conversations"
      className="flex min-h-0 flex-col gap-1 overflow-y-auto"
    >
      {conversations.length === 0 && (
        <Empty size="sm">
          <EmptyHeader>
            <EmptyTitle>No conversations yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      {conversations.map((conversation) => (
        <Button
          key={conversation.id}
          variant={conversation.id === currentId ? "secondary" : "ghost"}
          aria-current={conversation.id === currentId}
          className="justify-start"
          onClick={() => onOpen(conversation.id)}
        >
          <span className="truncate">
            {conversation.title ?? "New conversation"}
          </span>
        </Button>
      ))}
    </nav>
  );
}
