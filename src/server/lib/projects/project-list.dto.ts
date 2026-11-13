import {
  IdFilter,
  IdListRequest,
} from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const ProjectListRequest = IdListRequest.extend({
  repositoryId: IdFilter.optional().describe(
    "Only the projects that contain one of these repositories"
  ),
});

export type ProjectListRequestDto = z.infer<typeof ProjectListRequest>;
