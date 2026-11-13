import { userTable } from "@server/lib/db/schema";
import type { UserSelect } from "@server/lib/db/schema";

export function userRow(override?: Partial<UserSelect>): UserSelect {
  return {
    id: "01960000-0000-7000-8000-000000000001",
    name: "Ada Admin",
    email: "ada@yapir.test",
    emailVerified: false,
    image: null,
    createdAt: new Date("2026-09-01T10:00:00Z"),
    updatedAt: new Date("2026-09-02T11:30:00Z"),
    role: "admin",
    ...override,
  };
}

userRow.table = userTable;
