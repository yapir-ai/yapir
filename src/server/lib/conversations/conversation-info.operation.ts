import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { ConversationInfoParamsDto } from "./conversation-info.dto";
import { toResponseDto } from "./conversation.dto";

// Conversations are private: another user's conversation is reported missing.
export function conversationInfoOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ conversationId }: ConversationInfoParamsDto) {
    const conversation = await db.query.conversationTable.findFirst({
      where: { id: conversationId, userId: (await currentUser.get()).id },
    });

    if (!conversation) {
      throw notFound("CONVERSATION_NOT_FOUND");
    }

    return { ...toResponseDto(conversation), messages: conversation.messages };
  }

  return { execute };
}
