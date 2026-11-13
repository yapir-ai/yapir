import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const AgentListRequest = IdListRequest;

export type AgentListRequestDto = z.infer<typeof AgentListRequest>;
