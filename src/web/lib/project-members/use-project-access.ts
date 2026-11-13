import { hasProjectAccess } from "@server/lib/auth/access";
import type { ProjectAccess } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useSessionUser } from "@web/lib/auth/session";

import { projectMemberInfoQuery } from "./project-member.queries";

export function useProjectAccess(access: ProjectAccess, projectId: string) {
  const user = useSessionUser();

  const { data: member } = useLiveSuspenseQuery(
    projectMemberInfoQuery(projectId, user.id)
  );

  return hasProjectAccess(access, user, member);
}
