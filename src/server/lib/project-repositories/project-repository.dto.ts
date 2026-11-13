import type { ProjectRepositorySelect } from "@server/lib/db/schema";
import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { z } from "zod";

export const ProjectRepositoryParams = ProjectInfoParams.extend({
  repositoryId: z.uuid(),
});

export type ProjectRepositoryParamsDto = z.infer<
  typeof ProjectRepositoryParams
>;

export const toResponseDto = (link: ProjectRepositorySelect) => ({
  projectId: link.projectId,
  repositoryId: link.repositoryId,
});
