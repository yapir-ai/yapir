import { eq } from "@tanstack/react-db";
import { infoQuery, listFilter, query } from "@web/lib/db/query";
import { usersCollection } from "@web/lib/users/user.collection";

import { skillsCollection } from "./skill.collection";

export function skillListQuery(search = "", showDeleted = false) {
  const { term, matches } = listFilter(search, showDeleted);

  return {
    queryKey: ["skills", term, showDeleted],
    ...query((q) =>
      q
        .from({ skill: skillsCollection })
        .innerJoin({ author: usersCollection }, ({ skill, author }) =>
          eq(skill.authorId, author.id)
        )
        .fn.where(({ skill }) =>
          matches(skill.deletedAt, skill.name, skill.description)
        )
        .orderBy(({ skill }) => skill.name)
    ),
  };
}

export function skillInfoQuery(skillId: string) {
  return infoQuery(skillsCollection, skillId);
}
