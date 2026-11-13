import { stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

export const listPageSize = 10;

export const ListRouteSearch = z.object({
  search: z.string().default(""),
  offset: z.int().nonnegative().default(0),
});

export const SoftDeleteListRouteSearch = ListRouteSearch.extend({
  showDeleted: z.boolean().default(false),
});

export function listRouteSearch<T extends z.ZodObject>(schema: T) {
  return {
    validateSearch: schema,
    search: {
      middlewares: [stripSearchParams<z.output<T>>(schema.parse({}))],
    },
  };
}

export function listPage<T>(rows: T[], offset: number) {
  return rows.slice(offset, offset + listPageSize);
}

export function searchFilters(search: string) {
  return search ? [`“${search}”`] : [];
}
