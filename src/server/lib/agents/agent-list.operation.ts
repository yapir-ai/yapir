import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { AgentListRequestDto } from "./agent-list.dto";
import { toResponseDto } from "./agent.dto";

export function agentListOperation({ db }: { db: Db }) {
  async function execute({ offset, limit, id, order }: AgentListRequestDto) {
    const agents = await db.query.agentTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: agents.map(toResponseDto) };
  }

  return { execute };
}

export type AgentListOperation = ReturnType<typeof agentListOperation>;
