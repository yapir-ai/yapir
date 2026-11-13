import type { Db } from "@server/lib/db";
import { forbidden, unauthorized } from "@server/lib/errors/error.factory";
import { isAPIError } from "better-auth/api";

import {
  hasProjectAccess as projectAccessRule,
  isOrganizationAdmin,
  readableProjects as readableProjectsRule,
} from "./access";
import type { ProjectAccess } from "./access";
import type { SessionAuth } from "./auth";

export function currentUser({
  sessionAuth,
  db,
  headers,
}: {
  sessionAuth: SessionAuth;
  db: Db;
  headers: Headers;
}) {
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

export type CurrentUser = ReturnType<typeof currentUser>;
