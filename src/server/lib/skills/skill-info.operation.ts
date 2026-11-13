import type { Db } from "@server/lib/db";
import { notFound } from "@server/lib/errors/error.factory";

import type { SkillInfoParamsDto } from "./skill-info.dto";
import { toResponseDto } from "./skill.dto";

export function skillInfoOperation({ db }: { db: Db }) {
  async function execute({ skillId }: SkillInfoParamsDto) {
    const skill = await db.query.skillTable.findFirst({
      where: { id: skillId },
    });

    if (!skill) {
      throw notFound("SKILL_NOT_FOUND");
    }

    return toResponseDto(skill);
  }

  return { execute };
}
