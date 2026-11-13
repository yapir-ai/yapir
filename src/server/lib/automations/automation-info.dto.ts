import { z } from "zod";

export const AutomationInfoRequest = z.object({ automationId: z.uuid() });

export type AutomationInfoRequestDto = z.infer<typeof AutomationInfoRequest>;
