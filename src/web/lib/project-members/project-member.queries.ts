import { eq, isUndefined } from "@tanstack/react-db";
import { query } from "@web/lib/db/query";
import { usersCollection } from "@web/lib/users/user.collection";

import { projectMembersCollection } from "./project-member.collection";

export function projectMemberListQuery(projectId: string) {
  return query((q) =>
    q
      .from({ member: projectMembersCollection(projectId) })
      .innerJoin({ user: usersCollection }, ({ member, user }) =>
        eq(member.userId, user.id)
      )
      .orderBy(({ user }) => user.name)
  );
}

export function projectMemberInfoQuery(projectId: string, userId: string) {
  return query((q) =>
    q
      .from({ member: projectMembersCollection(projectId) })
      .where(({ member }) => eq(member.userId, userId))
      .findOne()
  );
}

// Users who are not members of the project.
export function projectNonMemberListQuery(projectId: string) {
  return query((q) =>
    q
      .from({ user: usersCollection })
      .leftJoin(
        { member: projectMembersCollection(projectId) },
        ({ user, member }) => eq(user.id, member.userId)
      )
      .where(({ member }) => isUndefined(member))
      .orderBy(({ user }) => user.name)
      .select(({ user }) => ({ ...user }))
  );
}
