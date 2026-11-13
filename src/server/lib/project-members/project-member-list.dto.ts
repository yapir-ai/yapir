import { ListOrder } from "@server/lib/pagination/list-filter.dto";
import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import type { z } from "zod";

export const ProjectMemberListRequest = PaginationRequest.extend({
  order: ListOrder,
});

export type ProjectMemberListRequestDto = z.infer<
  typeof ProjectMemberListRequest
>;
