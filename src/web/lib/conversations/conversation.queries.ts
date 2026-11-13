import { eq } from "@tanstack/react-db";
import { query } from "@web/lib/db/query";

import { conversationsCollection } from "./conversation.collection";

export function conversationListQuery() {
  return query((q) =>
    q
      .from({ conversation: conversationsCollection })
      .orderBy(({ conversation }) => conversation.id, "desc")
  );
}

export function conversationInfoQuery(conversationId: string) {
  return query((q) =>
    q
      .from({ conversation: conversationsCollection })
      .where(({ conversation }) => eq(conversation.id, conversationId))
      .findOne()
  );
}
