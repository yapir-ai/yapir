import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { skillTable } from "@server/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

import type { SkillInfoParamsDto } from "./skill-info.dto";
import type { SkillService } from "./skill.service";

export function skillDeleteOperation({
  db,
  clock,
  skillService,
}: {
  db: Db;
  clock: Clock;
  skillService: SkillService;
}) {
  async function execute({ skillId }: SkillInfoParamsDto) {
    const skill = await db.query.skillTable.findFirst({
      where: { id: skillId },
    });

    if (!skill) {
      return;
    }

    await skillService.requireAuthor(skill);
    await db
      .update(skillTable)
      .set({ deletedAt: clock.now })
      .where(and(eq(skillTable.id, skillId), isNull(skillTable.deletedAt)));
  }

  return { execute };
}
