import type { Db } from "@server/lib/db";
import { EmptyFilter } from "drizzle-orm";

import type { SkillListRequestDto } from "./skill-list.dto";
import { toResponseDto } from "./skill.dto";

export function skillListOperation({ db }: { db: Db }) {
  async function execute({ offset, limit, id, order }: SkillListRequestDto) {
    const skills = await db.query.skillTable.findMany({
      where: {
        id: id ? { in: id } : EmptyFilter,
      },
      orderBy: { id: order },
      offset,
      limit,
    });

    return { items: skills.map(toResponseDto) };
  }

  return { execute };
}
