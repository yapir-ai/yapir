import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { AgentInfoParamsDto } from "./agent-info.dto";
import { toResponseDto } from "./agent.dto";

export function agentInfoOperation({ db }: { db: Db }) {
  async function execute({ agentId }: AgentInfoParamsDto) {
    const agent = await db.query.agentTable.findFirst({
      where: { id: agentId },
    });

    if (!agent) {
      throw notFound("AGENT_NOT_FOUND");
    }

    return toResponseDto(agent);
  }

  return { execute };
}
