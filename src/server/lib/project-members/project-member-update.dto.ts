import { ProjectRoleSchema } from "@server/lib/auth/role.dto";
import { z } from "zod";

export const ProjectMemberUpdateRequest = z.strictObject({
  role: ProjectRoleSchema,
});

export type ProjectMemberUpdateRequestDto = z.infer<
  typeof ProjectMemberUpdateRequest
>;
