import { IdListRequest } from "@server/lib/pagination/list-filter.dto";
import type { z } from "zod";

export const UserListRequest = IdListRequest;

export type UserListRequestDto = z.infer<typeof UserListRequest>;
