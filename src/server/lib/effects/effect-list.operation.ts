import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { EffectListRequestDto } from "./effect-list.dto";
import { toResponseDto } from "./effect-list.dto";

export function effectListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    taskId,
    executionId,
    order,
    offset,
    limit,
  }: EffectListRequestDto) {
    const effects = await db.query.effectTable.findMany({
      where: {
        taskId: taskId ? { in: taskId } : EmptyFilter,
        executionId: executionId ? { in: executionId } : EmptyFilter,
        task: {
          automation: { project: await currentUser.readableProjects() },
        },
      },
      orderBy: {
        createdAt: order,
        integration: order,
        host: order,
        kind: order,
        externalId: order,
      },
      offset,
      limit,
    });

    return { items: effects.map(toResponseDto) };
  }

  return { execute };
}
