import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const ModelProviderListRequest = IdListRequest;

export type ModelProviderListRequestDto = z.infer<
  typeof ModelProviderListRequest
>;
