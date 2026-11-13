import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { agentTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { conflict, notFound } from "@server/lib/errors/error.factory";
import type { TriggerEventRegistry } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { requireModelProvider } from "@server/lib/model-providers/model-provider.validator";
import { eq } from "drizzle-orm";

import type { AgentInfoParamsDto } from "./agent-info.dto";
import type { AgentUpdateRequestDto } from "./agent-update.dto";
import { toResponseDto } from "./agent.dto";
import { requireSkills, requireValidTriggers } from "./agent.validator";

export function agentUpdateOperation({
  db,
  currentUser,
  triggerEventRegistry,
  eventFilterService,
}: {
  db: Db;
  currentUser: CurrentUser;
  triggerEventRegistry: Promise<TriggerEventRegistry>;
  eventFilterService: EventFilterService;
}) {
  async function execute(
    { agentId }: AgentInfoParamsDto,
    requestDto: AgentUpdateRequestDto
  ) {
    await currentUser.requireAdmin();

    const current = await db.query.agentTable.findFirst({
      where: { id: agentId },
    });

    if (!current) {
      throw notFound("AGENT_NOT_FOUND");
    }

    if (current.deletedAt) {
      throw conflict("AGENT_DELETED");
    }

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(current);
    }

    if (requestDto.modelProviderId) {
      await requireModelProvider(db, requestDto.modelProviderId);
    }

    if (requestDto.skillIds) {
      await requireSkills(db, requestDto.skillIds);
    }

    if (requestDto.triggers) {
      await requireValidTriggers(
        triggerEventRegistry,
        eventFilterService,
        requestDto.triggers
      );
    }

    const [agent] = await db
      .update(agentTable)
      .set(requestDto)
      .where(eq(agentTable.id, agentId))
      .returning();

    return toResponseDto(agent!);
  }

  return { execute };
}
