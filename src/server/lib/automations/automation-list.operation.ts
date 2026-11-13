import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { AutomationListRequestDto } from "./automation-list.dto";
import { toResponseDto } from "./automation.dto";

export function automationListOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute({
    offset,
    limit,
    agentId,
    projectId,
    id,
    order,
  }: AutomationListRequestDto) {
    const automations = await db.query.automationTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
        agentId: agentId ? { in: agentId } : EmptyFilter,
        projectId: projectId ? { in: projectId } : EmptyFilter,
        project: await currentUser.readableProjects(),
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return {
      items: automations.map(toResponseDto),
    };
  }

  return { execute };
}

export type AutomationListOperation = ReturnType<
  typeof automationListOperation
>;
