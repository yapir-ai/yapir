import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { executionMessageTable } from "@server/lib/db/schema";
import type { ExecutionSelect } from "@server/lib/db/schema";
import { validateUIMessages } from "ai";

import type { ExecutionMessageCreateRequestDto } from "./execution-message-create.dto";

export function executionMessageCreateOperation({
  db,
  clock,
}: {
  db: Db;
  clock: Clock;
}) {
  async function execute(
    { id: executionId }: ExecutionSelect,
    message: ExecutionMessageCreateRequestDto
  ) {
    const [validated] = await validateUIMessages({ messages: [message] });
    await db
      .insert(executionMessageTable)
      .values({
        id: message.id,
        executionId,
        message: validated!,
        createdAt: clock.now,
      })
      .onConflictDoNothing();
  }

  return { execute };
}
