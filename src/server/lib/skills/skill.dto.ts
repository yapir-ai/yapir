import type { SkillSelect } from "@server/lib/db/schema";
import { z } from "zod";

export const SkillNameSchema = z
  .string()
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
    "Use lowercase letters, digits and single hyphens"
  )
  .describe(
    "The SKILL.md name: lowercase letters, digits and single hyphens, up to 64 characters. Other skills can have the same name"
  );

export const SkillDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .describe("The SKILL.md description: what the skill does and when to use it");

export const SkillInstructionsSchema = z
  .string()
  .trim()
  .min(1)
  .describe("The SKILL.md body, in Markdown");

export const toResponseDto = (skill: SkillSelect) => ({
  id: skill.id,
  deletedAt: skill.deletedAt,
  name: skill.name,
  description: skill.description,
  instructions: skill.instructions,
  authorId: skill.authorId,
});
