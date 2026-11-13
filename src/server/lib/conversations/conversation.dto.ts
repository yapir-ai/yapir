import type { ConversationSelect } from "@server/lib/db/schema";

export const toResponseDto = (
  conversation: Omit<ConversationSelect, "messages">
) => ({
  id: conversation.id,
  title: conversation.title,
  createdAt: conversation.createdAt.toISOString(),
  updatedAt: conversation.updatedAt.toISOString(),
});
