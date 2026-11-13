import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { executionTable } from "@server/lib/db/schema";
import { EmptyFilter, desc, eq } from "drizzle-orm";

import type { ExecutionListRequestDto } from "./execution-list.dto";
import { toResponseDto } from "./execution.dto";

export function executionListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    id,
    taskId,
    projectId,
    outcome,
    active,
    latest,
    offset,
    limit,
    order,
  }: ExecutionListRequestDto) {
    const executions = await db.query.executionTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
        taskId: taskId ? { in: taskId } : EmptyFilter,
        outcome: outcome ? { in: outcome } : EmptyFilter,
        AND: [{ outcome: active ? { isNull: true } : EmptyFilter }],
        task: {
          automation: {
            projectId: projectId ? { in: projectId } : EmptyFilter,
            project: await currentUser.readableProjects(),
          },
        },
        RAW: latest
          ? (table) =>
              eq(
                table.id,
                db
                  .select({ id: executionTable.id })
                  .from(executionTable)
                  .where(eq(executionTable.taskId, table.taskId))
                  .orderBy(
                    desc(executionTable.queuedAt),
                    desc(executionTable.id)
                  )
                  .limit(1)
              )
          : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: executions.map(toResponseDto) };
  }

  return { execute };
}
