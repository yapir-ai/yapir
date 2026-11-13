import { z } from "zod";

export const ConversationInfoParams = z.object({ conversationId: z.uuid() });

export type ConversationInfoParamsDto = z.infer<typeof ConversationInfoParams>;
