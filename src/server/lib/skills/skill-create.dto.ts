import { z } from "zod";

import {
  SkillDescriptionSchema,
  SkillInstructionsSchema,
  SkillNameSchema,
} from "./skill.dto";

export const SkillCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: SkillNameSchema,
  description: SkillDescriptionSchema,
  instructions: SkillInstructionsSchema,
});

export type SkillCreateRequestDto = z.infer<typeof SkillCreateRequest>;
