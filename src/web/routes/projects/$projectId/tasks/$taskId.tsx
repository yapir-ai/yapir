import { ProjectInfoParams } from "@server/lib/projects/project-info.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@web/components/ui/message-scroller";
import { Page, PageHeader } from "@web/components/ui/page";
import { automationDispatchersQuery } from "@web/lib/automations/automation-catalog.queries";
import { useProjectAccess } from "@web/lib/project-members/use-project-access";
import { projectRepositoryListQuery } from "@web/lib/project-repositories/project-repository.queries";
import { BreadcrumbLabel } from "@web/lib/shell/app-breadcrumbs";
import { TaskHeader } from "@web/lib/tasks/task-header";
import { TaskMessageComposer } from "@web/lib/tasks/task-message-composer";
import { TaskProperties } from "@web/lib/tasks/task-properties";
import { useTaskRefresh } from "@web/lib/tasks/task-refresh";
import { TaskTimeline } from "@web/lib/tasks/task-timeline";
import { isActiveTask, taskTitle } from "@web/lib/tasks/task.presentation";
import {
  taskEffectsQuery,
  taskEventsQuery,
  taskExecutionsQuery,
  taskInfoQuery,
  taskMessagesQuery,
} from "@web/lib/tasks/task.queries";
import { userListQuery } from "@web/lib/users/user.queries";
import { z } from "zod";

const TaskRouteParams = ProjectInfoParams.extend({ taskId: z.uuid() });

export const Route = createFileRoute("/projects/$projectId/tasks/$taskId")({
  params: { parse: (params) => TaskRouteParams.parse(params) },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.dbClient.preloadLiveQuery(
        taskInfoQuery(params.projectId, params.taskId)
      ),
      context.dbClient.preloadLiveQuery(taskExecutionsQuery(params.taskId)),
      context.dbClient.preloadLiveQuery(taskEventsQuery(params.taskId)),
      context.dbClient.preloadLiveQuery(taskEffectsQuery(params.taskId)),
      context.dbClient.preloadLiveQuery(taskMessagesQuery(params.taskId)),
      context.dbClient.preloadLiveQuery(userListQuery()),
      context.dbClient.preloadLiveQuery(
        projectRepositoryListQuery(params.projectId)
      ),
      context.dbClient.preloadLiveQuery(automationDispatchersQuery),
    ]);
  },
  staticData: {
    breadcrumb: <TaskBreadcrumb />,
    description:
      "A task's executions, with their events, transcripts and effects.",
  },
  remountDeps: ({ params }) => params.taskId,
  component: TaskInfoPage,
  notFoundComponent: () => <PageHeader title="Task not found" />,
});

function TaskBreadcrumb() {
  const { projectId, taskId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(taskInfoQuery(projectId, taskId));

  return (
    <BreadcrumbLabel>{data ? taskTitle(data.task) : "Task"}</BreadcrumbLabel>
  );
}

function TaskInfoPage() {
  const { projectId, taskId } = Route.useParams();
  const { data } = useLiveSuspenseQuery(taskInfoQuery(projectId, taskId));

  const { data: executions } = useLiveSuspenseQuery(
    taskExecutionsQuery(taskId)
  );

  const { data: events } = useLiveSuspenseQuery(taskEventsQuery(taskId));
  const { data: effects } = useLiveSuspenseQuery(taskEffectsQuery(taskId));
  const { data: messages } = useLiveSuspenseQuery(taskMessagesQuery(taskId));
  const canWrite = useProjectAccess("write", projectId);
  const active = data ? isActiveTask(data.task) : false;
  useTaskRefresh(taskId, active);

  if (!data) {
    throw notFound({ routeId: Route.id });
  }

  const { task, automation, agent } = data;

  return (
    <Page
      width="wide"
      className="@container max-h-[calc(100svh-var(--app-header-height)-2rem)] min-h-0"
    >
      <TaskHeader task={task} canWrite={canWrite} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-8 @4xl:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex min-h-0 flex-col gap-4">
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  <MessageScrollerItem>
                    <TaskTimeline
                      executions={executions}
                      events={events}
                      effects={effects}
                      messages={messages}
                    />
                  </MessageScrollerItem>
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          {canWrite && automation?.enabled && (
            <TaskMessageComposer taskId={taskId} active={active} />
          )}
        </div>
        <TaskProperties
          projectId={projectId}
          task={task}
          automation={automation}
          agent={agent}
          executions={executions}
        />
      </div>
    </Page>
  );
}
