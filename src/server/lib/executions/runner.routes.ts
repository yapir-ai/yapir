import { gitRoutes } from "@server/lib/git/git.routes";
import { hono } from "@server/lib/hono/hono.factory";
import { modelProxyRoutes } from "@server/lib/model-proxy/model-proxy.routes";
import { TaskSessionUpdateRequest } from "@server/lib/tasks/task-session.dto";
import { validator } from "hono-openapi";

import { ExecutionClaimRequest } from "./execution-claim.dto";
import { ExecutionFailRequest } from "./execution-fail.dto";
import { ExecutionMessageCreateRequest } from "./execution-message-create.dto";
import { ExecutionPullRequest } from "./execution-pull.dto";
import { executionMiddleware, runnerMiddleware } from "./execution.middleware";
import { agentPath, runnerCallPath } from "./runner-path";

export const runnerRoutes = hono()
  .post(
    runnerCallPath.claim,
    validator("json", ExecutionClaimRequest),
    async (c) =>
      c.json(await c.var.container.taskLifecycle.claim(c.req.valid("json")))
  )
  .post(
    runnerCallPath.pull,
    runnerMiddleware,
    validator("json", ExecutionPullRequest),
    async (c) =>
      c.json(
        await c.var.container.taskLifecycle.pull(
          c.var.execution,
          c.req.valid("json")
        )
      )
  )
  .post(
    runnerCallPath.turnEnd,
    runnerMiddleware,
    validator("json", ExecutionPullRequest),
    async (c) =>
      c.json(
        await c.var.container.taskLifecycle.endTurn(
          c.var.execution,
          c.req.valid("json")
        )
      )
  )
  .post(
    runnerCallPath.fail,
    runnerMiddleware,
    validator("json", ExecutionFailRequest),
    async (c) =>
      c.json(
        await c.var.container.taskLifecycle.fail(
          c.var.execution,
          c.req.valid("json")
        )
      )
  )
  .post(
    agentPath.messages,
    executionMiddleware,
    validator("json", ExecutionMessageCreateRequest),
    async (c) => {
      await c.var.container.executionMessageCreateOperation.execute(
        c.var.execution,
        c.req.valid("json")
      );

      return c.body(null, 204);
    }
  )
  .post(
    agentPath.session,
    executionMiddleware,
    validator("json", TaskSessionUpdateRequest),
    async (c) => {
      await c.var.container.taskSessionUpdateOperation.execute(
        c.var.execution,
        c.req.valid("json")
      );

      return c.body(null, 204);
    }
  )
  .route(agentPath.git, gitRoutes)
  .route(agentPath.model, modelProxyRoutes)
  .all(
    agentPath.mcp,
    executionMiddleware,
    async (c) =>
      await c.var.container.taskMcpOperation.execute(c.req.raw, c.var.execution)
  );
