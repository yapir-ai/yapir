import type { ProjectMemberSelect } from "@server/lib/db/schema";
import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { z } from "zod";

export const ProjectMemberParams = ProjectInfoParams.extend({
  userId: z.uuid(),
});

export type ProjectMemberParamsDto = z.infer<typeof ProjectMemberParams>;

export const toResponseDto = (member: ProjectMemberSelect) => ({
  projectId: member.projectId,
  userId: member.userId,
  role: member.role,
});
