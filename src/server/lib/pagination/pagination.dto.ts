import { z } from "zod";

export const paginationMaxLimit = 100;

export const PaginationRequest = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(paginationMaxLimit).default(10),
});
