import { ProjectRoleSchema } from "@server/lib/auth/role.dto";

export const projectRoleOptions = Object.entries(ProjectRoleSchema.enum).map(
  ([label, value]) => ({ label, value })
);
