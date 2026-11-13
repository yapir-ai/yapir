import { ProviderIcon } from "@web/components/ui/provider-icon";
import type { ReactNode } from "react";

interface CatalogEntry {
  provider: { id: string; label: string };
  resource: { id: string; label: string };
  label: string;
}

export function Catalog<T extends CatalogEntry>({
  entries,
  search,
  emptyMessage,
  children,
}: {
  entries: T[];
  search: string;
  emptyMessage: string;
  children: (entry: T) => ReactNode;
}) {
  const groups = groupCatalog(entries, search);
  return (
    <div className="space-y-4">
      {groups.map(({ provider, resources }) => (
        <CatalogProvider key={provider.id} provider={provider}>
          {resources.map(({ resource, items }) => (
            <CatalogResource key={resource.id} label={resource.label}>
              {items.map(children)}
            </CatalogResource>
          ))}
        </CatalogProvider>
      ))}
      {groups.length === 0 && <CatalogMessage>{emptyMessage}</CatalogMessage>}
    </div>
  );
}

function CatalogProvider({
  provider,
  children,
}: {
  provider: { id: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <h2 className="bg-muted/30 flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
        <ProviderIcon provider={provider.id} />
        {provider.label}
      </h2>
      <div className="grid grid-cols-2 gap-4 p-4 *:only:col-span-2">
        {children}
      </div>
    </section>
  );
}

function CatalogResource({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium">{label}</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-x-4 gap-y-2">
        {children}
      </div>
    </section>
  );
}

export function CatalogMessage({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground py-3 text-sm">{children}</p>;
}

export function groupCatalog<T extends CatalogEntry>(
  entries: T[],
  search = ""
) {
  const term = search.toLowerCase();
  const filtered = entries.filter((entry) =>
    `${entry.provider.label} ${entry.resource.label} ${entry.label}`
      .toLowerCase()
      .includes(term)
  );
  const providers = [
    ...new Map(
      filtered.map((entry) => [entry.provider.id, entry.provider])
    ).values(),
  ];
  return providers.map((provider) => {
    const items = filtered.filter((entry) => entry.provider.id === provider.id);
    const resources = [
      ...new Map(
        items.map((entry) => [entry.resource.id, entry.resource])
      ).values(),
    ];
    return {
      provider,
      resources: resources.map((resource) => ({
        resource,
        items: items.filter((entry) => entry.resource.id === resource.id),
      })),
    };
  });
}
