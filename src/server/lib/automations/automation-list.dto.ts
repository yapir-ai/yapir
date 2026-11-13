import {
  IdFilter,
  IdListRequest,
} from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const AutomationListRequest = IdListRequest.extend({
  agentId: IdFilter.optional(),
  projectId: IdFilter.optional(),
});

export type AutomationListRequestDto = z.infer<typeof AutomationListRequest>;
