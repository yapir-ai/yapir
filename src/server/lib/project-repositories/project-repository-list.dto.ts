import { ListOrder } from "@server/lib/pagination/list-filter.dto";
import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import type { z } from "zod";

export const ProjectRepositoryListRequest = PaginationRequest.extend({
  order: ListOrder,
});

export type ProjectRepositoryListRequestDto = z.infer<
  typeof ProjectRepositoryListRequest
>;
