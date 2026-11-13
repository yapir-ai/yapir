import type { Db } from "@server/lib/db";
import { skillTable } from "@server/lib/db/schema";
import { eq } from "drizzle-orm";

import type { SkillInfoParamsDto } from "./skill-info.dto";
import { toResponseDto } from "./skill.dto";
import type { SkillService } from "./skill.service";

export function skillRestoreOperation({
  db,
  skillService,
}: {
  db: Db;
  skillService: SkillService;
}) {
  async function execute({ skillId }: SkillInfoParamsDto) {
    await skillService.requireWritableSkill(skillId);

    const [skill] = await db
      .update(skillTable)
      .set({ deletedAt: null })
      .where(eq(skillTable.id, skillId))
      .returning();

    return toResponseDto(skill!);
  }

  return { execute };
}
