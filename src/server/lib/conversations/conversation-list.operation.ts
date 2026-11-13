import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";

import type { ConversationListRequestDto } from "./conversation-list.dto";
import { toResponseDto } from "./conversation.dto";

export function conversationListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({ offset, limit }: ConversationListRequestDto) {
    const conversations = await db.query.conversationTable.findMany({
      columns: { messages: false },
      where: { userId: (await currentUser.get()).id },
      // UUIDv7 IDs: newest first.
      orderBy: { id: "desc" },
      offset,
      limit,
    });

    return { items: conversations.map(toResponseDto) };
  }

  return { execute };
}
