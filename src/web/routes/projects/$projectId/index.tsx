import { isOrganizationAdmin } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DeletedBadge } from "@web/components/soft-delete-controls";
import { Button, buttonVariants } from "@web/components/ui/button";
import { Code } from "@web/components/ui/code";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemLink,
  ItemMedia,
  ItemTitle,
} from "@web/components/ui/item";
import { Link as TextLink } from "@web/components/ui/link";
import { Page, PageHeader, PageSection } from "@web/components/ui/page";
import {
  needsAttentionQuery,
  runningNowQuery,
} from "@web/lib/activity/activity.queries";
import { ExecutionActivity } from "@web/lib/activity/execution-activity";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { useSessionUser } from "@web/lib/auth/session";
import { automationEventsQuery } from "@web/lib/automations/automation-catalog.queries";
import { AutomationEnabled } from "@web/lib/automations/automation-enabled";
import { automationListQuery } from "@web/lib/automations/automation.queries";
import type { SoftDeleteMetadata } from "@web/lib/db/collection";
import { toastFailure } from "@web/lib/errors";
import {
  CostSummary,
  usePreloadCostMetrics,
} from "@web/lib/metrics/metrics-summary";
import { executionMetricsQuery } from "@web/lib/metrics/metrics.queries";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { ProjectIcon } from "@web/lib/projects/project-icon";
import { projectsCollection } from "@web/lib/projects/project.collection";
import { projectInfoQuery } from "@web/lib/projects/project.queries";
import { repositoryUrl } from "@web/lib/repositories/repository-url";
import { Trash2, Workflow } from "lucide-react";
import { Suspense, useTransition } from "react";

const costGroupBy = "automationId";

export const Route = createFileRoute("/projects/$projectId/")({
  loader: async ({ context, params }) =>
    await Promise.all([
      context.dbClient.preloadLiveQuery(automationListQuery(params.projectId)),
      context.dbClient.preloadLiveQuery(automationEventsQuery),
      context.dbClient.preloadLiveQuery(
        projectRepositoryListQuery(params.projectId)
      ),
      context.dbClient.preloadLiveQuery(needsAttentionQuery(params.projectId)),
      context.dbClient.preloadLiveQuery(runningNowQuery(params.projectId)),
    ]),
  staticData: {
    description:
      "Overview of a project: its repositories, the cost of the last 30 days by automation, its running and failed tasks, and its automations.",
  },
  component: ProjectOverviewPage,
});

function ProjectOverviewPage() {
  const { projectId } = Route.useParams();
  const { data: project } = useLiveSuspenseQuery(projectInfoQuery(projectId));

  if (!project) {
    return null;
  }

  return (
    <Page>
      <PageHeader
        title={project.name}
        icon={<ProjectIcon project={project} />}
        description={<ProjectRepositories projectId={projectId} />}
        badge={<DeletedBadge deletedAt={project.deletedAt} />}
      />
      {project.deletedAt ? (
        <DeletedProject projectId={projectId} />
      ) : (
        <ProjectContent projectId={projectId} />
      )}
    </Page>
  );
}

function ProjectContent({ projectId }: { projectId: string }) {
  const { data: automations } = useLiveSuspenseQuery(
    automationListQuery(projectId)
  );

  if (automations.length === 0) {
    return <NoAutomations projectId={projectId} />;
  }

  return (
    <>
      <Suspense>
        <ProjectActivity projectId={projectId} />
      </Suspense>
      <ProjectAutomations projectId={projectId} />
    </>
  );
}

function ProjectRepositories({ projectId }: { projectId: string }) {
  const { data: repositories } = useLiveSuspenseQuery(
    projectRepositoryListQuery(projectId)
  );

  return (
    <span className="flex flex-wrap gap-x-3">
      {repositories.map((repository) => (
        <TextLink
          key={repository.id}
          to={repositoryUrl(repository)}
          target="_blank"
          rel="noreferrer"
          variant="muted"
        >
          <Code>{repository.path}</Code>
        </TextLink>
      ))}
    </span>
  );
}

function ProjectActivity({ projectId }: { projectId: string }) {
  usePreloadCostMetrics({ projectId }, costGroupBy);

  const totals = useLiveSuspenseQuery(executionMetricsQuery({ projectId }))
    .data[0]!;

  const { data: failed } = useLiveSuspenseQuery(needsAttentionQuery(projectId));

  if (totals.executions === 0 && failed.length === 0) {
    return (
      <Empty size="sm" className="flex-none">
        <EmptyHeader>
          <EmptyTitle>No execution in the last 30 days</EmptyTitle>
          <EmptyDescription>
            Agents start on the next events that match the triggers of the
            automations.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <CostSummary filters={{ projectId }} groupBy={costGroupBy} />
      <ExecutionActivity projectId={projectId} />
    </>
  );
}

function DeletedProject({ projectId }: { projectId: string }) {
  const { dbClient } = Route.useRouteContext();
  const isAdmin = isOrganizationAdmin(useSessionUser());
  const [isPending, startMutation] = useTransition();

  function restoreProject() {
    startMutation(async () => {
      await toastFailure(
        dbClient
          .collection(projectsCollection)
          .update(
            projectId,
            { metadata: { intent: "restore" } satisfies SoftDeleteMetadata },
            (draft) => {
              draft.deletedAt = null;
            }
          )
      );
    });
  }

  return (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trash2 aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Project deleted</EmptyTitle>
        <EmptyDescription>
          Its automations were deleted with it. A restore keeps them deleted.
        </EmptyDescription>
      </EmptyHeader>
      {isAdmin && (
        <EmptyContent>
          <Button disabled={isPending} onClick={restoreProject}>
            Restore project
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

function NoAutomations({ projectId }: { projectId: string }) {
  const canWrite = useProjectAccess("write", projectId);

  return (
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
      {canWrite && (
        <EmptyContent className="flex-row justify-center">
          <Link
            to="/projects/$projectId/automations"
            params={{ projectId }}
            className={buttonVariants({ variant: "outline" })}
          >
            Start from an agent
          </Link>
          <Link
            to="/projects/$projectId/automations/create"
            params={{ projectId }}
            className={buttonVariants()}
          >
            Create automation
          </Link>
        </EmptyContent>
      )}
    </Empty>
  );
}

function ProjectAutomations({ projectId }: { projectId: string }) {
  const { data: rows } = useLiveSuspenseQuery(automationListQuery(projectId));
  const canWrite = useProjectAccess("write", projectId);

  const { data: events } = useLiveSuspenseQuery(automationEventsQuery);
  const eventLabels = new Map(events.map(({ type, label }) => [type, label]));

  return (
    <PageSection
      title="Automations"
      action={
        canWrite && (
          <Link
            to="/projects/$projectId/automations/create"
            params={{ projectId }}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Create automation
          </Link>
        )
      }
    >
      <ItemGroup aria-label="Automations">
        {rows.map(({ automation, agent }) => (
          <div key={automation.id} role="listitem">
            <Item size="xs">
              <ItemMedia>
                <AgentIcon agent={{ id: automation.agentId }} size="xs" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  <ItemLink
                    to="/projects/$projectId/automations/$automationId"
                    params={{ projectId, automationId: automation.id }}
                  >
                    {automation.name}
                  </ItemLink>
                </ItemTitle>
                <ItemDescription>
                  <Link
                    to="/agents/$agentId"
                    params={{ agentId: automation.agentId }}
                  >
                    {agent?.name ?? "Agent unavailable"}
                  </Link>
                  {automation.triggers.map(
                    ({ type }) => ` · ${eventLabels.get(type) ?? type}`
                  )}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <AutomationEnabled enabled={automation.enabled} />
              </ItemActions>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </PageSection>
  );
}
