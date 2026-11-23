// oxlint-disable eslint/require-await The CurrentUser contract returns promises.
import type { ProjectSelect } from "@server/lib/db/schema";
import { forbidden, unauthorized } from "@server/lib/errors/error.factory";

import type { CurrentUser } from "./current-user";

// An execution reads Yapir as a Project User of its project. It is not a user, and it writes nothing.
export function executionReader({
  id,
}: Pick<ProjectSelect, "id">): CurrentUser {
  return {
    async get() {
      throw unauthorized("UNAUTHENTICATED");
    },
    async requireAdmin() {
      throw forbidden("ORGANIZATION_ADMIN_REQUIRED");
    },
    // oxlint-disable-next-line unicorn/no-useless-undefined An execution is the member of no project.
    projectMember: async () => undefined,
    async hasProjectAccess(access, projectId) {
      return access === "read" && projectId === id;
    },
    async readableProjects() {
      return { id };
    },
  };
}
