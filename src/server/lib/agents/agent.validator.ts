import type { Trigger } from "@server/lib/automations/automation.dto";
import type { Db } from "@server/lib/db";
import {
  badRequest,
  conflict,
  notFound,
} from "@server/lib/errors/error.factory";
import type { TriggerEventRegistry } from "@server/lib/events/event-definition";
import type { EventFilterService } from "@server/lib/events/event-filter.service";

export async function requireSkills(db: Db, skillIds: string[]) {
  const skills = await db.query.skillTable.findMany({
    columns: { name: true },
    where: { id: { in: skillIds } },
  });

  if (skills.length < new Set(skillIds).size) {
    throw notFound("SKILL_NOT_FOUND");
  }

  if (new Set(skills.map(({ name }) => name)).size < skills.length) {
    throw conflict("SKILL_NAME_CONFLICT");
  }
}

export async function requireValidTriggers(
  triggerEventRegistry: Promise<TriggerEventRegistry>,
  eventFilterService: EventFilterService,
  triggers: Trigger[]
) {
  const registry = await triggerEventRegistry;

  for (const trigger of triggers) {
    const filter = registry.get(trigger.type)?.filter ?? eventFilterService;
    const reason = filter.check(trigger);

    if (reason) {
      throw badRequest("INVALID_TRIGGER_FILTER", reason);
    }
  }
}
