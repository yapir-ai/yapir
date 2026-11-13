import { infoQuery, query } from "@web/lib/db/query";

import { usersCollection } from "./user.collection";

export function userListQuery(search = "") {
  const term = search.trim().toLowerCase();

  return {
    queryKey: ["users", term],
    ...query((q) =>
      q
        .from({ user: usersCollection })
        .fn.where(({ user }) =>
          [user.name, user.email].some((value) =>
            value.toLowerCase().includes(term)
          )
        )
        .orderBy(({ user }) => user.name)
    ),
  };
}

export function userInfoQuery(userId: string) {
  return infoQuery(usersCollection, userId);
}
