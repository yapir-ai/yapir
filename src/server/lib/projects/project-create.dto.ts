import { z } from "zod";

import { ProjectInstructionsSchema, ProjectNameSchema } from "./project.dto";

export const ProjectCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: ProjectNameSchema,
  instructions: ProjectInstructionsSchema.default(""),
});

export type ProjectCreateRequestDto = z.infer<typeof ProjectCreateRequest>;
