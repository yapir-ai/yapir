import { z } from "zod";

import {
  SkillDescriptionSchema,
  SkillInstructionsSchema,
  SkillNameSchema,
} from "./skill.dto";

export const SkillUpdateRequest = z
  .strictObject({
    name: SkillNameSchema,
    description: SkillDescriptionSchema,
    instructions: SkillInstructionsSchema,
  })
  .partial();

export type SkillUpdateRequestDto = z.infer<typeof SkillUpdateRequest>;
