import { z } from "zod";

export const ModelProviderCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: z.string().trim().min(1),
  catalogId: z
    .string()
    .trim()
    .min(1)
    .describe("The provider's ID in the provider catalog"),
  baseUrl: z.url(),
  apiKey: z.string().trim().min(1),
});

export type ModelProviderCreateRequestDto = z.infer<
  typeof ModelProviderCreateRequest
>;
