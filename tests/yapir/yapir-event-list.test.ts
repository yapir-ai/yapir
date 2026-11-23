import { automationRow } from "@test/kit/factories/automation";
import { taskRow } from "@test/kit/factories/task";
import { taskEventRow } from "@test/kit/factories/task-event";
import {
  executionToken,
  insertRunningExecution,
} from "@test/kit/running-execution";
import { expect, test } from "@test/kit/test";

test("a scoped grant reads the events of the tasks of its automation", async ({
  insert,
  mcp,
}) => {
  const { agent, project, task, execution } = await insertRunningExecution(
    insert,
    { capabilities: [{ name: "yapir.tasks.read", unscoped: false }] }
  );

  const sibling = await insert(automationRow, {
    id: "01960000-0000-7000-8000-000000000402",
    name: "Triage issues",
    agentId: agent.id,
    projectId: project.id,
  });

  const siblingTask = await insert(taskRow, {
    id: "01960000-0000-7000-8000-000000000602",
    automationId: sibling.id,
  });

  const correction = await insert(taskEventRow, {
    taskId: task.id,
    eventId: "yapir:message-1",
    notification: {
      type: "yapir.message",
      data: { message: "Run bun check first.", userName: "Ada Admin" },
      author: null,
    },
    state: "acknowledged",
    executionId: execution.id,
  });

  await insert(taskEventRow, {
    taskId: siblingTask.id,
    eventId: "yapir:message-2",
    notification: {
      type: "yapir.message",
      data: { message: "Label it as a bug.", userName: "Ada Admin" },
      author: null,
    },
  });

  expect(
    await mcp.call(executionToken, "yapir_event_list", {
      type: "yapir.message",
    })
  ).toEqual({
    items: [
      {
        taskId: task.id,
        eventId: correction.eventId,
        type: "yapir.message",
        receivedAt: correction.receivedAt.toISOString(),
        state: "acknowledged",
        executionId: execution.id,
        label: "Message",
        presentation: {
          actor: { name: "Ada Admin" },
          excerpt: "Run bun check first.",
        },
        data: { message: "Run bun check first.", userName: "Ada Admin" },
      },
    ],
  });
});
