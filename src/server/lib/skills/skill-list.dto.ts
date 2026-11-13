import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const SkillListRequest = IdListRequest;

export type SkillListRequestDto = z.infer<typeof SkillListRequest>;
