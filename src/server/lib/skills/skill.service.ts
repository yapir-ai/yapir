import { canWriteSkill } from "@server/lib/auth/access";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import type { SkillSelect } from "@server/lib/db/schema";
import { forbidden, notFound } from "@server/lib/errors/error.factory";

export function skillService({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function requireAuthor(skill: SkillSelect) {
    if (!canWriteSkill(await currentUser.get(), skill)) {
      throw forbidden("SKILL_AUTHOR_REQUIRED");
    }
  }

  async function requireWritableSkill(skillId: string) {
    const skill = await db.query.skillTable.findFirst({
      where: { id: skillId },
    });

    if (!skill) {
      throw notFound("SKILL_NOT_FOUND");
    }

    await requireAuthor(skill);

    return skill;
  }

  return { requireAuthor, requireWritableSkill };
}

export type SkillService = ReturnType<typeof skillService>;
