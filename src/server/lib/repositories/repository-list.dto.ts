import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const RepositoryListRequest = IdListRequest;

export type RepositoryListRequestDto = z.infer<typeof RepositoryListRequest>;
