import { hono } from "@server/lib/hono/hono.factory";
import { describeRoute, validator } from "hono-openapi";

import { ConversationInfoParams } from "./conversation-info.dto";
import { ConversationListRequest } from "./conversation-list.dto";
import {
  ConversationMessageCreateParams,
  ConversationMessageCreateRequest,
} from "./conversation-message-create.dto";

export const conversationRoutes = hono()
  .get(
    "/",
    describeRoute({
      operationId: "conversationList",
      summary: "List your conversations with the Assistant, most recent first",
    }),
    validator("query", ConversationListRequest),
    async (c) => {
      const page = await c.var.container.conversationListOperation.execute(
        c.req.valid("query")
      );

      return c.json(page);
    }
  )
  .get(
    "/:conversationId",
    describeRoute({
      operationId: "conversationInfo",
      summary:
        "Read one of your conversations with the Assistant, with its messages",
    }),
    validator("param", ConversationInfoParams),
    async (c) =>
      c.json(
        await c.var.container.conversationInfoOperation.execute(
          c.req.valid("param")
        )
      )
  )
  .post(
    "/:conversationId/messages",
    describeRoute({
      operationId: "conversationMessageCreate",
      summary:
        "Send a message to the Assistant, creating the conversation at its first message. Streams the answer as an AI SDK UI message stream",
    }),
    validator("param", ConversationMessageCreateParams),
    validator("json", ConversationMessageCreateRequest),
    async (c) =>
      await c.var.container.conversationMessageCreateOperation.execute(
        c.req.valid("param"),
        c.req.valid("json")
      )
  );
