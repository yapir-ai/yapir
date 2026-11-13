import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { agentTable } from "@server/lib/db/schema";
import type { TriggerEventRegistry } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";
import { requireModelProvider } from "@server/lib/model-providers/model-provider.validator";

import type { AgentCreateRequestDto } from "./agent-create.dto";
import { toResponseDto } from "./agent.dto";
import { requireSkills, requireValidTriggers } from "./agent.validator";

export function agentCreateOperation({
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
  async function execute(requestDto: AgentCreateRequestDto) {
    await currentUser.requireAdmin();
    await requireModelProvider(db, requestDto.modelProviderId);

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

    const [agent] = await db.insert(agentTable).values(requestDto).returning();

    return toResponseDto(agent!);
  }

  return { execute };
}
