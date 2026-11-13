import { PageHeader } from "@web/components/ui/page";
import { RelativeTime } from "@web/components/ui/relative-time";

import { TaskResource } from "./task-resource";
import { TaskState, taskStates } from "./task-state";
import { TaskStopButton } from "./task-stop-button";
import { isActiveTask, taskTitle } from "./task.presentation";
import type { Task } from "./task.presentation";

export function TaskHeader({
  task,
  canWrite,
}: {
  task: Task;
  canWrite: boolean;
}) {
  const subject = task.associations[0]!;

  return (
    <div className="grid gap-3">
      <PageHeader title={taskTitle(task)}>
        {canWrite && isActiveTask(task) && <TaskStopButton taskId={task.id} />}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TaskState state={task.state} size="lg">
          {taskStates[task.state].label}
          {" · "}
          <RelativeTime date={task.stateChangedAt} />
        </TaskState>
        <TaskResource
          provider={subject.integration}
          host={subject.host}
          label={subject.presentation.label}
          url={subject.presentation.url}
        />
      </div>
    </div>
  );
}
