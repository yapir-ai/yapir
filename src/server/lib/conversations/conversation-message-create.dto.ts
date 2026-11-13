import type { UIMessage } from "ai";
import { z } from "zod";

export const ConversationMessageCreateParams = z.object({
  conversationId: z
    .uuidv7()
    .describe("A new conversation takes the ID its first message is sent to"),
});

export type ConversationMessageCreateParamsDto = z.infer<
  typeof ConversationMessageCreateParams
>;

export const ConversationMessageMetadata = z
  .object({
    context: z
      .string()
      .describe("What the model knows of the conversation without showing it"),
  })
  .optional();

export type ConversationMessage = UIMessage<
  z.infer<typeof ConversationMessageMetadata>
>;

const textParts = z.array(
  z.object({ type: z.literal("text"), text: z.string() })
);

export const ConversationMessageCreateRequest = z.object({
  message: z
    .object({
      id: z.string().min(1),
      role: z.literal("user"),
      parts: textParts,
    })
    .describe("The user's new message, as an AI SDK UI message"),
  opening: z
    .object({
      id: z.string().min(1),
      role: z.literal("assistant"),
      parts: textParts,
      metadata: ConversationMessageMetadata,
    })
    .optional()
    .describe(
      "The assistant message a new conversation opens with, written by the client"
    ),
  location: z
    .object({
      path: z.string(),
      params: z.object({ projectId: z.uuid().optional() }).catchall(z.string()),
    })
    .describe("The web app page the user is on, with its route parameters"),
  pageMap: z
    .array(z.object({ path: z.string(), description: z.string() }))
    .describe("The web app pages the Assistant may link to"),
});

export type ConversationMessageCreateRequestDto = z.infer<
  typeof ConversationMessageCreateRequest
>;
