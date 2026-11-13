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
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { agentListQuery } from "@web/lib/agents/agent.queries";
import { HarnessLabel } from "@web/lib/agents/harness-label";
import { useSessionUser } from "@web/lib/auth/session";
import {
  listPage,
  searchFilters,
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/agents/")({
  ...listRouteSearch(SoftDeleteListRouteSearch),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, deps }) =>
    await context.dbClient.preloadLiveQuery(
      agentListQuery("", deps.showDeleted)
    ),
  staticData: { description: "Agents of the organization." },
  component: AgentsPage,
});

function AgentsPage() {
  const { search, offset, showDeleted } = Route.useSearch();
  const { data } = useLiveSuspenseQuery(agentListQuery(search, showDeleted));
  const agents = listPage(data, offset);
  const isAdmin = isOrganizationAdmin(useSessionUser());

  const emptyState = search ? (
    <ListNoResults noun="agents" filters={searchFilters(search)} />
  ) : (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bot aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No agents yet</EmptyTitle>
        <EmptyDescription>
          An agent combines instructions, a model and a harness.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Page width="wide">
      <PageHeader
        title="Agents"
        description="Reusable instructions, model and harness configurations."
      >
        {isAdmin && (
          <CreateLink to="/agents/create" className={buttonVariants()}>
            Create agent
          </CreateLink>
        )}
      </PageHeader>
      <ListToolbar>
        <ListSearch label="Search agents" value={search} />
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      {agents.length === 0 ? (
        emptyState
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Harness</TableHead>
              <TableHead>Model</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell grow>
                  <span className="flex items-center gap-2">
                    <AgentIcon agent={agent} size="xs" />
                    <TableRowLink
                      to="/agents/$agentId"
                      params={{ agentId: agent.id }}
                    >
                      {agent.name}
                    </TableRowLink>
                    <DeletedBadge deletedAt={agent.deletedAt} />
                  </span>
                </TableCell>
                <TableCell variant="muted">
                  <HarnessLabel harness={agent.harness} />
                </TableCell>
                <TableCell variant="muted">
                  <Code>{agent.model}</Code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={agents.length}
        total={data.length}
        noun={["agent", "agents"]}
      />
    </Page>
  );
}
