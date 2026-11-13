import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { ExecutionMessageListRequest } from "./execution-message-list.dto";

export const executionMessageRoutes = hono().get(
  "/",
  describeRoute({
    operationId: "executionMessageList",
    summary:
      "List the messages of execution transcripts, as AI SDK UI messages: each turn's prompt, then the agent's text, reasoning and tool calls",
  }),
  validator("query", ExecutionMessageListRequest),
  async (c) =>
    c.json(
      await c.var.container.executionMessageListOperation.execute(
        c.req.valid("query")
      )
    )
);
