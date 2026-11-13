import { z } from "zod";

// The catalog entry is fixed: agents name models of it.
export const ModelProviderUpdateRequest = z
  .strictObject({
    name: z.string().trim().min(1),
    baseUrl: z.url(),
    apiKey: z.string().trim().min(1),
  })
  .partial();

export type ModelProviderUpdateRequestDto = z.infer<
  typeof ModelProviderUpdateRequest
>;
