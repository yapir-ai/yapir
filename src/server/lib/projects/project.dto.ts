import type { ProjectSelect } from "@server/lib/db/schema";
import { z } from "zod";

export const ProjectNameSchema = z.string().trim().min(1);

export const ProjectInstructionsSchema = z
  .string()
  .trim()
  .describe(
    "Markdown that the agents of the project's automations receive after their own instructions, such as the role of each repository"
  );

export const toResponseDto = (project: ProjectSelect) => ({
  id: project.id,
  deletedAt: project.deletedAt,
  name: project.name,
  instructions: project.instructions,
  ciRepositoryId: project.ciRepositoryId,
});
