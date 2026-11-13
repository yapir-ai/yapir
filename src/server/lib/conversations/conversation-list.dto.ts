import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import type { z } from "zod";

export const ConversationListRequest = PaginationRequest;

export type ConversationListRequestDto = z.infer<
  typeof ConversationListRequest
>;
