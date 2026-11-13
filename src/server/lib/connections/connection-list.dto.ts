import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import type { z } from "zod";

export const ConnectionListRequest = PaginationRequest;

export type ConnectionListRequestDto = z.infer<typeof ConnectionListRequest>;
