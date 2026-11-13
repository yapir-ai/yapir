import { ProjectRoleSchema } from "@server/lib/auth/role.dto";
import { z } from "zod";

export const ProjectMemberCreateRequest = z.strictObject({
  userId: z.uuid(),
  role: ProjectRoleSchema,
});

export type ProjectMemberCreateRequestDto = z.infer<
  typeof ProjectMemberCreateRequest
>;
