import {
  OrganizationRoleSchema,
  ProjectRoleSchema,
} from "@server/lib/auth/role.dto";
import type {
  ProjectMemberSelect,
  SkillSelect,
  UserSelect,
} from "@server/lib/db/schema";
import { EmptyFilter } from "drizzle-orm";

export type ProjectAccess = "read" | "write";

export function isOrganizationAdmin(user: Pick<UserSelect, "role">) {
  return user.role === OrganizationRoleSchema.enum.Admin;
}

// Organization Admins access every project; members read it, and Project Admins write it.
export function hasProjectAccess(
  access: ProjectAccess,
  user: Pick<UserSelect, "role">,
  member: Pick<ProjectMemberSelect, "role"> | undefined
) {
  if (isOrganizationAdmin(user)) {
    return true;
  }

  return access === "read"
    ? member !== undefined
    : member?.role === ProjectRoleSchema.enum.Admin;
}

// The read rule above as a project filter for relational queries: an empty filter lets Organization Admins read every project.
export function readableProjects(user: Pick<UserSelect, "id" | "role">) {
  return {
    members: isOrganizationAdmin(user) ? EmptyFilter : { userId: user.id },
  } as const;
}

export function canWriteSkill(
  user: Pick<UserSelect, "id" | "role">,
  skill: Pick<SkillSelect, "authorId">
) {
  return isOrganizationAdmin(user) || user.id === skill.authorId;
}
