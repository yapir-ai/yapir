import { isOrganizationAdmin } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { CreateLink } from "@web/components/create-link";
import {
  ListNoResults,
  ListPagination,
  ListSearch,
  ListToolbar,
  ShowDeletedFilter,
} from "@web/components/list-controls";
import { DeletedBadge } from "@web/components/soft-delete-controls";
import { buttonVariants } from "@web/components/ui/button";
import { Code } from "@web/components/ui/code";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowLink,
} from "@web/components/ui/table";
import { useSessionUser } from "@web/lib/auth/session";
import {
  listPage,
  searchFilters,
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";
import { modelProviderListQuery } from "@web/lib/model-providers/model-provider.queries";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/model-providers/")({
  ...listRouteSearch(SoftDeleteListRouteSearch),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, deps }) =>
    await context.dbClient.preloadLiveQuery(
      modelProviderListQuery("", deps.showDeleted)
    ),
  staticData: { description: "Model providers of the organization." },
  component: ModelProvidersPage,
});

function ModelProvidersPage() {
  const { search, offset, showDeleted } = Route.useSearch();

  const { data } = useLiveSuspenseQuery(
    modelProviderListQuery(search, showDeleted)
  );

  const modelProviders = listPage(data, offset);
  const isAdmin = isOrganizationAdmin(useSessionUser());

  const emptyState = search ? (
    <ListNoResults noun="model providers" filters={searchFilters(search)} />
  ) : (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRound aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No model providers yet</EmptyTitle>
        <EmptyDescription>
          Agents reach their models through a model provider.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Page width="wide">
      <PageHeader
        title="Model providers"
        description="Endpoints and API keys that agents use to reach their models."
      >
        {isAdmin && (
          <CreateLink to="/model-providers/create" className={buttonVariants()}>
            Add model provider
          </CreateLink>
        )}
      </PageHeader>
      <ListToolbar>
        <ListSearch label="Search model providers" value={search} />
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      {modelProviders.length === 0 ? (
        emptyState
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Base URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelProviders.map((modelProvider) => (
              <TableRow key={modelProvider.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <ModelProviderIcon
                      catalogId={modelProvider.catalogId}
                      size="xs"
                    />
                    <TableRowLink
                      to="/model-providers/$modelProviderId"
                      params={{ modelProviderId: modelProvider.id }}
                    >
                      {modelProvider.name}
                    </TableRowLink>
                    <DeletedBadge deletedAt={modelProvider.deletedAt} />
                  </span>
                </TableCell>
                <TableCell variant="muted">{modelProvider.catalogId}</TableCell>
                <TableCell variant="muted" grow>
                  <Code>{modelProvider.baseUrl}</Code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={modelProviders.length}
        total={data.length}
        noun={["model provider", "model providers"]}
      />
    </Page>
  );
}
