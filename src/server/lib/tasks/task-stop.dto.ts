import { z } from "zod";

export const TaskStopParams = z.object({ taskId: z.uuid() });
