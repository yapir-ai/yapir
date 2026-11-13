import { RelativeTime } from "@web/components/ui/relative-time";
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

import { TaskState } from "./task-state";
import { costLabel, taskTitle } from "./task.presentation";
import type { TaskRow } from "./task.presentation";

export function TaskList({
  rows,
  projectId,
}: {
  rows: TaskRow[];
  projectId: string;
}) {
  return (
    <Table aria-label="Tasks">
      <TableHeader>
        <TableRow>
          <TableHead>Automation</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>State</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Last execution</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ task, automation, agent, execution }) => (
          <TableRow key={task.id}>
            <TableCell variant="muted">
              <span className="flex items-center gap-2">
                {agent && <AgentIcon agent={agent} size="xs" />}
                {automation?.name ?? "Automation unavailable"}
              </span>
            </TableCell>
            <TableCell grow>
              <TableRowLink
                to="/projects/$projectId/tasks/$taskId"
                params={{ projectId, taskId: task.id }}
              >
                {taskTitle(task)}
              </TableRowLink>
            </TableCell>
            <TableCell>
              <TaskState state={task.state} />
            </TableCell>
            <TableCell variant="numeric">{costLabel(task.cost)}</TableCell>
            <TableCell variant="numeric">
              <RelativeTime
                date={
                  execution
                    ? (execution.startedAt ?? execution.queuedAt)
                    : task.stateChangedAt
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
