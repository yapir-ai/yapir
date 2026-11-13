import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";
import { v7 as uuidv7 } from "uuid";

import { TaskListRequest } from "./task-list.dto";
import {
  TaskMessageCreateParams,
  TaskMessageCreateRequest,
} from "./task-message-create.dto";
import { taskMessageEventType } from "./task-message.event";
import { TaskSessionInfoParams } from "./task-session.dto";
import { TaskStopParams } from "./task-stop.dto";

export const taskRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "taskList",
      summary:
        "List tasks: pieces of work of an automation, with their state and their associated external resources",
    }),
    validator("query", TaskListRequest),
    async (c) =>
      c.json(
        await c.var.container.taskListOperation.execute(c.req.valid("query"))
      )
  )
  .post(
    "/:taskId/messages",
    describeRoute({
      operationId: "taskMessageCreate",
      summary:
        "Send a message to the task's agent: it becomes an event of the task, which the active execution takes at its next turn, or which starts an execution",
    }),
    validator("param", TaskMessageCreateParams),
    validator("json", TaskMessageCreateRequest),
    async (c) => {
      const [accepted] = await c.var.container.eventProcessOperation.execute({
        id: uuidv7(),
        type: taskMessageEventType,
        payload: { ...c.req.valid("param"), ...c.req.valid("json") },
      });

      return c.json({ eventId: accepted!.eventId }, 201);
    }
  )
  .post(
    "/:taskId/stop",
    describeRoute({
      operationId: "taskStop",
      summary:
        "Stop the task's active execution: the events that it did not finish wait for the task's next event, which starts a new execution with them. No-op when the task has no active execution",
    }),
    validator("param", TaskStopParams),
    async (c) => {
      await c.var.container.taskMachine.stop(c.req.valid("param"));

      return c.body(null, 204);
    }
  )
  .get(
    "/:taskId/session",
    describeRoute({
      operationId: "taskSessionInfo",
      summary:
        "Get the task's latest harness session, as its harness stores it, to continue it on another machine with `yapir task fork`",
    }),
    validator("param", TaskSessionInfoParams),
    async (c) =>
      c.json(
        await c.var.container.taskSessionInfoOperation.execute(
          c.req.valid("param")
        )
      )
  );
