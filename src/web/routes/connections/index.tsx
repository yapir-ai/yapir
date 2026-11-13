import { isOrganizationAdmin } from "@server/lib/auth/access";
import { ConnectionTypeSchema } from "@server/lib/connections/connection.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ListToolbar, ShowDeletedFilter } from "@web/components/list-controls";
import { DeletedBadge } from "@web/components/soft-delete-controls";
import { buttonVariants } from "@web/components/ui/button";
import { Code } from "@web/components/ui/code";
import { Empty, EmptyHeader, EmptyTitle } from "@web/components/ui/empty";
import { Page, PageHeader, PageSection } from "@web/components/ui/page";
import { ProviderIcon } from "@web/components/ui/provider-icon";
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
import { ConnectionStatus } from "@web/lib/connections/connection-status";
import { connectionLabels } from "@web/lib/connections/connection.presentation";
import { connectionListQuery } from "@web/lib/connections/connection.queries";
import {
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { mcpServerListQuery } from "@web/lib/mcp-servers/mcp-server.queries";
import { webhookAuthLabels } from "@web/lib/webhooks/webhook.options";
import { webhookListQuery } from "@web/lib/webhooks/webhook.queries";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/connections/")({
  ...listRouteSearch(SoftDeleteListRouteSearch.pick({ showDeleted: true })),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, deps }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(connectionListQuery),
      context.dbClient.preloadLiveQuery(mcpServerListQuery(deps.showDeleted)),
      context.dbClient.preloadLiveQuery(webhookListQuery(deps.showDeleted)),
    ]),
  staticData: {
    description:
      "The organization's GitHub, GitLab and Jira Connections, its MCP servers and its webhooks.",
  },
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { showDeleted } = Route.useSearch();
  const isAdmin = isOrganizationAdmin(useSessionUser());

  return (
    <Page width="wide">
      <PageHeader
        title="Connections"
        description="The external services Yapir receives events from and acts on."
      />
      <ListToolbar>
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      <PageSection title="Services">
        <ServiceList />
      </PageSection>
      <PageSection
        title="MCP servers"
        description="Remote MCP servers whose tools Yapir proxies to agents."
        action={
          isAdmin && (
            <Link
              to="/connections/mcp/create"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Plus aria-hidden="true" />
              Add MCP server
            </Link>
          )
        }
      >
        <McpServerList showDeleted={showDeleted} />
      </PageSection>
      <PageSection
        title="Webhooks"
        description="Endpoints whose deliveries are events for automations."
        action={
          isAdmin && (
            <Link
              to="/connections/webhooks/create"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Plus aria-hidden="true" />
              Add webhook
            </Link>
          )
        }
      >
        <WebhookList showDeleted={showDeleted} />
      </PageSection>
    </Page>
  );
}

function ServiceList() {
  const { data } = useLiveSuspenseQuery(connectionListQuery);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ConnectionTypeSchema.options.map((type) => (
          <TableRow key={type}>
            <TableCell grow>
              <span className="flex items-center gap-2">
                <ProviderIcon provider={type} />
                <TableRowLink to="/connections/$type" params={{ type }}>
                  {connectionLabels[type]}
                </TableRowLink>
              </span>
            </TableCell>
            <TableCell>
              <ConnectionStatus
                connected={data.some((connection) => connection.type === type)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function McpServerList({ showDeleted }: { showDeleted: boolean }) {
  const { data } = useLiveSuspenseQuery(mcpServerListQuery(showDeleted));

  if (data.length === 0) {
    return (
      <Empty variant="outline" size="sm">
        <EmptyHeader>
          <EmptyTitle>No MCP servers yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>URL</TableHead>
          <TableHead className="text-right">Tools</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((mcpServer) => (
          <TableRow key={mcpServer.id}>
            <TableCell>
              <span className="flex items-center gap-2">
                <TableRowLink
                  to="/connections/mcp/$mcpServerId"
                  params={{ mcpServerId: mcpServer.id }}
                >
                  {mcpServer.name}
                </TableRowLink>
                <DeletedBadge deletedAt={mcpServer.deletedAt} />
              </span>
            </TableCell>
            <TableCell variant="muted" grow>
              <Code>{mcpServer.url}</Code>
            </TableCell>
            <TableCell variant="numeric">{mcpServer.tools.length}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WebhookList({ showDeleted }: { showDeleted: boolean }) {
  const { data } = useLiveSuspenseQuery(webhookListQuery(showDeleted));

  if (data.length === 0) {
    return (
      <Empty variant="outline" size="sm">
        <EmptyHeader>
          <EmptyTitle>No webhooks yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Authentication</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell grow>
              <span className="flex items-center gap-2">
                <TableRowLink
                  to="/connections/webhooks/$webhookId"
                  params={{ webhookId: webhook.id }}
                >
                  {webhook.name}
                </TableRowLink>
                <DeletedBadge deletedAt={webhook.deletedAt} />
              </span>
            </TableCell>
            <TableCell variant="muted">
              {webhookAuthLabels[webhook.auth]} in {webhook.headerName}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
