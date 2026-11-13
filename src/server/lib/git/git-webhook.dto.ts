import { repositoryProviderEnum } from "@server/lib/db/schema";
import { z } from "zod";

export const GitWebhookParams = z.object({
  provider: z.enum(repositoryProviderEnum.enumValues),
});
