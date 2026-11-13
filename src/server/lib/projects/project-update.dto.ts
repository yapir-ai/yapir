import { z } from "zod";

import { ProjectInstructionsSchema, ProjectNameSchema } from "./project.dto";

export const ProjectUpdateRequest = z
  .strictObject({
    name: ProjectNameSchema,
    instructions: ProjectInstructionsSchema,
    ciRepositoryId: z
      .uuid()
      .describe(
        "The repository of the project whose CI runs the executions of its new automations, by default. Adding the first repository to the project sets it"
      ),
  })
  .partial();

export type ProjectUpdateRequestDto = z.infer<typeof ProjectUpdateRequest>;
