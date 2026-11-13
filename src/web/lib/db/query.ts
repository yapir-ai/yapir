import { eq } from "@tanstack/react-db";
import type {
  Context,
  InitialQueryBuilder,
  QueryBuilder,
} from "@tanstack/react-db";

export function query<TContext extends Context>(
  build: (q: InitialQueryBuilder) => QueryBuilder<TContext>
) {
  return { query: build };
}

export function deletedFilter(showDeleted: boolean) {
  return (deletedAt: string | null) => showDeleted || deletedAt === null;
}

export function listFilter(search: string, showDeleted: boolean) {
  const term = search.trim().toLowerCase();
  const visible = deletedFilter(showDeleted);

  return {
    term,
    matches: (deletedAt: string | null, ...searched: string[]) =>
      visible(deletedAt) &&
      searched.some((value) => value.toLowerCase().includes(term)),
  };
}

export function infoQuery<
  TSource extends Parameters<InitialQueryBuilder["from"]>[0][string],
>(source: TSource, id: string) {
  return query((q) =>
    q
      .from({ item: source })
      .where(({ item }) => eq(item.id, id))
      .findOne()
  );
}
