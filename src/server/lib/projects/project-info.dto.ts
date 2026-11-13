import { z } from "zod";

export const ProjectInfoParams = z.object({ projectId: z.uuid() });

export type ProjectInfoParamsDto = z.infer<typeof ProjectInfoParams>;
