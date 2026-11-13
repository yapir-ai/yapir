import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Db } from "@server/lib/db";
import { skillTable } from "@server/lib/db/schema";

import type { SkillCreateRequestDto } from "./skill-create.dto";
import { toResponseDto } from "./skill.dto";

export function skillCreateOperation({
  db,
  currentUser,
}: {
  db: Db;
  currentUser: CurrentUser;
}) {
  async function execute(requestDto: SkillCreateRequestDto) {
    const [skill] = await db
      .insert(skillTable)
      .values({ ...requestDto, authorId: (await currentUser.get()).id })
      .returning();

    return toResponseDto(skill!);
  }

  return { execute };
}
