import { PaginationRequest } from "@server/lib/pagination/pagination.dto";
import { z } from "zod";

// Hono unwraps a query parameter when it has only one value.
export function singleOrArray<T>(schema: z.ZodType<T>) {
  return z
    .array(schema)
    .min(1)
    .max(100)
    .or(schema.transform((value) => [value]));
}

export const IdFilter = singleOrArray(z.uuid()).describe(
  "One or more IDs: repeat the parameter for several"
);

// A query parameter is a string; a tool call, such as through MCP, sends a JSON boolean.
export const BooleanFilter = z
  .boolean()
  .or(z.enum(["true", "false"]).transform((value) => value === "true"));

export const SearchFilter = z.string().trim().min(1).max(200);

export const TimestampFilter = singleOrArray(z.iso.datetime()).describe(
  "ISO timestamps, matched to the millisecond"
);

export const ListOrder = z.enum(["asc", "desc"]).default("desc");

export const IdListRequest = PaginationRequest.extend({
  id: IdFilter.optional(),
  order: ListOrder,
});
