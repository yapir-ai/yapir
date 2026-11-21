import { paginationMaxLimit } from "@server/lib/pagination/pagination.dto";

export async function readListWindow<T>(
  fetchPage: (page: {
    offset: string;
    limit: string;
  }) => Promise<{ items: readonly T[] }>,
  { offset = 0, limit = Infinity }: { offset?: number; limit?: number } = {}
) {
  const items: T[] = [];

  while (items.length < limit) {
    const pageLimit = Math.min(paginationMaxLimit, limit - items.length);

    const { items: pageItems } = await fetchPage({
      offset: String(offset + items.length),
      limit: String(pageLimit),
    });

    items.push(...pageItems);

    if (pageItems.length < pageLimit) {
      break;
    }
  }

  return items;
}
