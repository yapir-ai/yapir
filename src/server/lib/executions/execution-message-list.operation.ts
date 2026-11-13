import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { ExecutionMessageListRequestDto } from "./execution-message-list.dto";
import { toResponseDto } from "./execution-message.dto";

export function executionMessageListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    id,
    taskId,
    executionId,
    offset,
    limit,
    order,
  }: ExecutionMessageListRequestDto) {
    const messages = await db.query.executionMessageTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
        executionId: executionId ? { in: executionId } : EmptyFilter,
        execution: {
          taskId: taskId ? { in: taskId } : EmptyFilter,
          task: {
            automation: {
              project: await currentUser.readableProjects(),
            },
          },
        },
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: messages.map(toResponseDto) };
  }

  return { execute };
}
