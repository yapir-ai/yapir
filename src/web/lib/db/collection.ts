import type { QueryClient, QueryFunctionContext } from "@tanstack/query-core";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryCollectionConfig } from "@tanstack/query-db-collection";
import { collectionOptions } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { toast } from "sonner";
import { z } from "zod";

const SoftDeleteMetadataSchema = z.object({
  intent: z.enum(["delete", "restore"]),
});

export type SoftDeleteMetadata = z.infer<typeof SoftDeleteMetadataSchema>;

export async function persistSoftDeletableMutation<T>(
  {
    modified,
    changes,
    metadata,
  }: { modified: T; changes: Partial<T>; metadata: unknown },
  {
    label,
    upsert,
    remove,
    restore,
    update,
  }: {
    label: string;
    upsert: (item: T) => void | Promise<void>;
    remove: () => Promise<void>;
    restore: () => Promise<T>;
    update?: (changes: Partial<T>) => Promise<T>;
  }
) {
  const schema = update
    ? SoftDeleteMetadataSchema.partial().optional()
    : SoftDeleteMetadataSchema;

  const intent = schema.parse(metadata)?.intent;

  if (intent === "delete") {
    await remove();
    await upsert(modified);
    toast.success(`${label} deleted`);
  } else if (intent === "restore") {
    await upsert(await restore());
    toast.success(`${label} restored`);
  } else if (update) {
    await upsert(await update(changes));
    toast.success(`${label} updated`);
  }

  return intent;
}

type ResourceCollectionConfig<
  T extends object,
  TKey extends string | number,
> = Omit<
  QueryCollectionConfig<
    T,
    (context: QueryFunctionContext<string[]>) => T[] | Promise<T[]>,
    unknown,
    string[],
    TKey
  >,
  "id" | "queryKey" | "queryClient"
> & { queryKey?: string[] };

export function collection<T extends object, TKey extends string | number>(
  id: string,
  options: ResourceCollectionConfig<T, TKey>,
  configure?: (client: DbClient) => Partial<ResourceCollectionConfig<T, TKey>>
) {
  return collectionOptions(id, (dbClient) => {
    const config = { ...options, ...configure?.(dbClient) };

    return queryCollectionOptions({
      defaultStringCollation: { stringSort: "lexical" },
      ...config,
      id,
      queryKey: config.queryKey ?? [id],
      queryClient: dbClient.requireDependency<QueryClient>("queryClient"),
    });
  });
}
