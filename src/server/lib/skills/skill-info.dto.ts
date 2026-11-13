import { z } from "zod";

export const SkillInfoParams = z.object({ skillId: z.uuid() });

export type SkillInfoParamsDto = z.infer<typeof SkillInfoParams>;
