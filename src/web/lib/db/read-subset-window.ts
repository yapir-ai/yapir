import {
  IdFilter,
  TimestampFilter,
} from "@server/lib/pagination/list-filter.dto";
import { paginationMaxLimit } from "@server/lib/pagination/pagination.dto";
import {
  parseOrderByExpression,
  parseWhereExpression,
} from "@tanstack/query-db-collection";
import type { LoadSubsetOptions } from "@tanstack/react-db";
import { z } from "zod";

import { readListWindow } from "./read-list-window";

interface Filter {
  field: string;
  values: string[];
}

interface SubsetContract<T> {
  equality: string[];
  unique?: string[];
  timestamps?: string[];
  sort?: Record<string, (row: T) => string>;
}

function subsetFilters(
  where: LoadSubsetOptions["where"],
  equality: string[],
  timestamps: string[],
  unique: string[]
) {
  const Comparison = z.tuple([
    z.tuple([z.enum([...equality, ...timestamps])]),
    z.array(z.string()),
  ]);

  function comparison(field: (string | number)[], values: string[]): Filter[] {
    const [[name], members] = Comparison.parse([field, values]);

    if (members.length === 0) {
      return [{ field: name, values: [] }];
    }

    if (timestamps.includes(name)) {
      return [{ field: name, values: TimestampFilter.parse(members) }];
    }

    const ids = z.array(z.uuid()).parse(members);

    if (!unique.includes(name) && ids.length > 0) {
      IdFilter.parse(ids);
    }

    return [{ field: name, values: ids }];
  }

  return (
    parseWhereExpression<Filter[]>(where, {
      handlers: {
        eq: (field: (string | number)[], value: string) =>
          comparison(field, [value]),
        in: comparison,
        and: (...filters: Filter[][]) => filters.flat(),
      },
    }) ?? []
  );
}

function subsetOrder<T extends { id: string }>(
  orderBy: LoadSubsetOptions["orderBy"],
  fields: SubsetContract<T>["sort"]
) {
  const sorts = parseOrderByExpression(orderBy);

  if (sorts.length > 2) {
    throw new Error("Unsupported resource ordering");
  }

  if (sorts.length < 2 && sorts[0]?.field.join(".") !== "id") {
    sorts.push({ field: ["id"], direction: "desc", nulls: "last" });
  }

  const sortFields = new Map(
    Object.entries({
      id: (row: T) => row.id,
      ...fields,
    })
  );

  const ordering = sorts.map((sort, index) => {
    const field = sort.field.join(".");
    const read = sortFields.get(field);

    if (
      !read ||
      (index > 0 && (field !== "id" || sort.direction !== "desc")) ||
      (sort.stringSort !== undefined && sort.stringSort !== "lexical")
    ) {
      throw new Error("Unsupported resource ordering");
    }

    return { read, direction: sort.direction };
  });

  const params = {
    sort: sorts[0]?.field.join(".") ?? "id",
    order: sorts[0]?.direction ?? "desc",
  };

  function compare(left: T, right: T) {
    for (const { read, direction } of ordering) {
      const leftValue = read(left);
      const rightValue = read(right);

      if (leftValue !== rightValue) {
        const comparison = leftValue < rightValue ? -1 : 1;

        return direction === "asc" ? comparison : -comparison;
      }
    }

    return 0;
  }

  return { params, compare };
}

/** ID and timestamp tie-group reads may be unbounded; lists require a window. */
export async function readSubsetWindow<T extends { id: string }>(
  fetchPage: (
    params: Record<string, string | string[]>
  ) => Promise<{ items: T[] }>,
  options: LoadSubsetOptions | undefined,
  contract: SubsetContract<T>
) {
  const { offset = 0, limit, where, orderBy } = options ?? {};
  const sorting = subsetOrder<T>(orderBy, contract.sort);
  const filters = new Map<string, string[]>();
  const timestamps = contract.timestamps ?? [];
  const unique = ["id", ...(contract.unique ?? [])];

  for (const { field, values } of subsetFilters(
    where,
    contract.equality,
    timestamps,
    unique
  )) {
    const previous = filters.get(field);
    filters.set(
      field,
      previous ? previous.filter((value) => values.includes(value)) : values
    );
  }

  if ([...filters.values()].some((values) => values.length === 0)) {
    return [];
  }

  const params = Object.fromEntries(filters);
  const uniqueField = unique.find((field) => filters.has(field));

  if (uniqueField) {
    const ids = filters.get(uniqueField)!;
    const uniqueIds = [...new Set(ids)];
    const requests = [];

    for (let start = 0; start < uniqueIds.length; start += paginationMaxLimit) {
      const batch = uniqueIds.slice(start, start + paginationMaxLimit);
      requests.push(
        fetchPage({
          ...params,
          [uniqueField]: batch,
          ...sorting.params,
          offset: "0",
          limit: String(batch.length),
        })
      );
    }

    const pages = await Promise.all(requests);

    return pages
      .flatMap((page) => page.items)
      .toSorted(sorting.compare)
      .slice(offset, limit === undefined ? undefined : offset + limit);
  }

  const timestampSubset = timestamps.some((field) => filters.has(field));

  if (!timestampSubset && (limit === undefined || !Number.isFinite(limit))) {
    throw new Error("Resource lists require a bounded window");
  }

  // A timestamp equality reads the complete tie group requested by TanStack DB.
  // Cursor expressions are optional hints; these endpoints use offset instead.
  return await readListWindow(
    async (page) =>
      await fetchPage({
        ...params,
        ...sorting.params,
        ...page,
      }),
    { offset, limit }
  );
}
