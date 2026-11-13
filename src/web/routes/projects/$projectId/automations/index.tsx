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
import { buttonVariants, Button } from "@web/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Link as TextLink } from "@web/components/ui/link";
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
import { AutomationAgentGallery } from "@web/lib/automations/automation-agent-gallery";
import {
  automationDispatchersQuery,
  automationEventsQuery,
} from "@web/lib/automations/automation-catalog.queries";
import { AutomationEnabled } from "@web/lib/automations/automation-enabled";
import { AutomationExecutionDialog } from "@web/lib/automations/automation-execution-dialog";
import { AutomationTriggers } from "@web/lib/automations/automation-triggers";
import { automationListQuery } from "@web/lib/automations/automation.queries";
import {
  listPage,
  searchFilters,
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { Play, Workflow } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/automations/")({
  ...listRouteSearch(SoftDeleteListRouteSearch),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, params, deps }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(
        automationListQuery(params.projectId, "", deps.showDeleted)
      ),
      context.dbClient.preloadLiveQuery(automationListQuery(params.projectId)),
      context.dbClient.preloadLiveQuery(agentListQuery()),
      context.dbClient.preloadLiveQuery(automationDispatchersQuery),
      context.dbClient.preloadLiveQuery(automationEventsQuery),
    ]),
  staticData: { description: "Automations of a project." },
  component: AutomationsPage,
});

function AutomationsPage() {
  const { projectId } = Route.useParams();
  const { search, offset, showDeleted } = Route.useSearch();

  const { data } = useLiveSuspenseQuery(
    automationListQuery(projectId, search, showDeleted)
  );

  const { data: events } = useLiveSuspenseQuery(automationEventsQuery);
  const rows = listPage(data, offset);
  const canWrite = useProjectAccess("write", projectId);

  const emptyState = search ? (
    <ListNoResults noun="automations" filters={searchFilters(search)} />
  ) : (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Workflow aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No automations yet</EmptyTitle>
        <EmptyDescription>
          An automation runs an agent when an event matches its triggers.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <TextLink
          to="/guides/$"
          params={{
            _splat: "execution-environments/github-actions.md",
          }}
          variant="muted"
        >
          Run executions in GitHub Actions
        </TextLink>
      </EmptyContent>
    </Empty>
  );

  return (
    <Page width="wide">
      <PageHeader
        title="Automations"
        description="An automation runs its agent on this project when an event matches one of its triggers."
      >
        {canWrite && (
          <CreateLink
            to="/projects/$projectId/automations/create"
            params={{ projectId }}
            className={buttonVariants()}
          >
            Create automation
          </CreateLink>
        )}
      </PageHeader>
      <ListToolbar>
        <ListSearch label="Search automations" value={search} />
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      {rows.length === 0 ? (
        emptyState
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Triggers</TableHead>
              <TableHead>State</TableHead>
              {canWrite && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ automation, agent }) => (
              <TableRow key={automation.id}>
                <TableCell variant="muted">
                  <span className="flex items-center gap-2">
                    <AgentIcon agent={{ id: automation.agentId }} size="xs" />
                    {agent?.name ?? "Agent unavailable"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <TableRowLink
                      to="/projects/$projectId/automations/$automationId"
                      params={{ projectId, automationId: automation.id }}
                    >
                      {automation.name}
                    </TableRowLink>
                    <DeletedBadge deletedAt={automation.deletedAt} />
                  </span>
                </TableCell>
                <TableCell variant="muted" grow>
                  <AutomationTriggers
                    triggers={automation.triggers}
                    events={events}
                  />
                </TableCell>
                <TableCell>
                  <AutomationEnabled enabled={automation.enabled} />
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    {!automation.deletedAt && (
                      <AutomationExecutionDialog
                        projectId={projectId}
                        automationId={automation.id}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Start execution"
                            title="Start execution"
                          >
                            <Play aria-hidden="true" />
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={rows.length}
        total={data.length}
        noun={["automation", "automations"]}
      />
      {canWrite && <AutomationAgentGallery projectId={projectId} />}
    </Page>
  );
}
