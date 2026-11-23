import type { Db } from "@server/lib/db";
import type { ProjectMemberSelect } from "@server/lib/db/schema";
import { forbidden, unauthorized } from "@server/lib/errors/error.factory";
import { isAPIError } from "better-auth/api";

import {
  hasProjectAccess as projectAccessRule,
  isOrganizationAdmin,
  readableProjects as readableProjectsRule,
} from "./access";
import type { ProjectAccess, ProjectFilter } from "./access";
import type { SessionAuth } from "./auth";

type SessionUser = NonNullable<
  Awaited<ReturnType<SessionAuth["api"]["getSession"]>>
>["user"];

export interface CurrentUser {
  get: () => Promise<SessionUser>;
  requireAdmin: () => Promise<void>;
  projectMember: (
    projectId: string
  ) => Promise<ProjectMemberSelect | undefined>;
  hasProjectAccess: (
    access: ProjectAccess,
    projectId: string
  ) => Promise<boolean>;
  readableProjects: () => Promise<ProjectFilter>;
}

export function currentUser({
  sessionAuth,
  db,
  headers,
}: {
  sessionAuth: SessionAuth;
  db: Db;
  headers: Headers;
}): CurrentUser {
  const session = resolveSession();

  // An invalid or revoked API key resolves no session.
  async function resolveSession() {
    try {
      return await sessionAuth.api.getSession({ headers });
    } catch (error) {
      if (isAPIError(error)) {
        return null;
      }

      throw error;
    }
  }

  async function get() {
    const resolved = await session;

    if (!resolved) {
      throw unauthorized("UNAUTHENTICATED");
    }

    return resolved.user;
  }

  async function isAdmin() {
    return isOrganizationAdmin(await get());
  }

  async function requireAdmin() {
    if (!(await isAdmin())) {
      throw forbidden("ORGANIZATION_ADMIN_REQUIRED");
    }
  }

  async function projectMember(projectId: string) {
    return await db.query.projectMemberTable.findFirst({
      where: { projectId, userId: (await get()).id },
    });
  }

  async function hasProjectAccess(access: ProjectAccess, projectId: string) {
    return projectAccessRule(
      access,
      await get(),
      await projectMember(projectId)
    );
  }

  async function readableProjects() {
    return readableProjectsRule(await get());
  }

  return {
    get,
    requireAdmin,
    projectMember,
    hasProjectAccess,
    readableProjects,
  };
}
