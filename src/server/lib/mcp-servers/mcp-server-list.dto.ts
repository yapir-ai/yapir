import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const McpServerListRequest = IdListRequest;

export type McpServerListRequestDto = z.infer<typeof McpServerListRequest>;
