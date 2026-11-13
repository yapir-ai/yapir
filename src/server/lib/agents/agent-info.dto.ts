import { z } from "zod";

export const AgentInfoParams = z.object({ agentId: z.uuid() });

export type AgentInfoParamsDto = z.infer<typeof AgentInfoParams>;
