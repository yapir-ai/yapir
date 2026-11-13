import { z } from "zod";

export const ModelProviderInfoParams = z.object({ modelProviderId: z.uuid() });

export type ModelProviderInfoParamsDto = z.infer<
  typeof ModelProviderInfoParams
>;
