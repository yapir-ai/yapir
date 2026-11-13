import type { Db } from "@server/lib/db";
import { conversationTable } from "@server/lib/db/schema";
import { lt } from "drizzle-orm";

export function conversationPurgeOperation({ db }: { db: Db }) {
  async function execute(cutoff: Date) {
    await db
      .delete(conversationTable)
      .where(lt(conversationTable.updatedAt, cutoff));
  }

  return { execute };
}

export type ConversationPurgeOperation = ReturnType<
  typeof conversationPurgeOperation
>;
