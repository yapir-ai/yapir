import type { Db } from "@server/lib/db";
import { skillTable } from "@server/lib/db/schema";
import { hasAnyChange } from "@server/lib/dto/change-checker";
import { conflict } from "@server/lib/errors/error.factory";
import { eq } from "drizzle-orm";

import type { SkillInfoParamsDto } from "./skill-info.dto";
import type { SkillUpdateRequestDto } from "./skill-update.dto";
import { toResponseDto } from "./skill.dto";
import type { SkillService } from "./skill.service";

export function skillUpdateOperation({
  db,
  skillService,
}: {
  db: Db;
  skillService: SkillService;
}) {
  async function execute(
    { skillId }: SkillInfoParamsDto,
    requestDto: SkillUpdateRequestDto
  ) {
    const current = await skillService.requireWritableSkill(skillId);

    if (current.deletedAt) {
      throw conflict("SKILL_DELETED");
    }

    if (!hasAnyChange(requestDto)) {
      return toResponseDto(current);
    }

    const [skill] = await db
      .update(skillTable)
      .set(requestDto)
      .where(eq(skillTable.id, skillId))
      .returning();

    return toResponseDto(skill!);
  }

  return { execute };
}
