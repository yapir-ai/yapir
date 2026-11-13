import type { AssistantInstructions } from "@server/lib/assistant/assistant-instructions";
import type {
  AssistantCallSettings,
  AssistantModel,
} from "@server/lib/assistant/assistant-model";
import type { AssistantTools } from "@server/lib/assistant/assistant-tools";
import type { CurrentUser } from "@server/lib/auth/current-user";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { conversationTable } from "@server/lib/db/schema";
import { notFound } from "@server/lib/errors/error.factory";
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  generateText,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { ConversationMessageMetadata } from "./conversation-message-create.dto";
import type {
  ConversationMessage,
  ConversationMessageCreateParamsDto,
  ConversationMessageCreateRequestDto,
} from "./conversation-message-create.dto";

export function conversationMessageCreateOperation({
  db,
  clock,
  currentUser,
  assistantModel,
  assistantInstructions,
  assistantTools,
  executionContext,
}: {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
  assistantModel: AssistantModel;
  assistantInstructions: AssistantInstructions;
  assistantTools: AssistantTools;
  executionContext: Pick<ExecutionContext, "waitUntil">;
}) {
  async function execute(
    { conversationId }: ConversationMessageCreateParamsDto,
    { message, opening, location, pageMap }: ConversationMessageCreateRequestDto
  ) {
    const callSettings = await assistantModel.load(conversationId);
    const conversation = await findConversation(conversationId);
    const history = conversation?.messages ?? (opening ? [opening] : []);

    const messages = await validateUIMessages<ConversationMessage>({
      messages: [...history, message],
      metadataSchema: ConversationMessageMetadata,
      tools: assistantTools,
    });

    const title = conversation?.title
      ? undefined
      : generateTitle(callSettings.model, messages);

    const result = streamText({
      ...callSettings,
      instructions: await assistantInstructions.build({
        location,
        pageMap,
        context: messages[0]?.metadata?.context,
      }),
      messages: await convertToModelMessages(messages),
      tools: assistantTools,
      stopWhen: isStepCount(10),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: messages,
        generateMessageId: generateId,
        // Application errors, such as an invalid CEL expression, are meant for the user.
        onError: (error) =>
          error instanceof HTTPException ? error.message : "An error occurred.",
        onEnd: async ({ messages: allMessages }) => {
          await saveMessages(conversationId, allMessages);

          if (title) {
            await saveTitle(conversationId, await title);
          }
        },
      }),
      // Runs the answer to its end, then saves it, even when the client leaves mid-stream.
      consumeSseStream: ({ stream }) => {
        executionContext.waitUntil(consumeStream({ stream }));
      },
    });
  }

  // Another user's conversation is reported missing; an unknown one is new.
  async function findConversation(conversationId: string) {
    const conversation = await db.query.conversationTable.findFirst({
      where: { id: conversationId },
    });

    if (conversation && conversation.userId !== (await currentUser.get()).id) {
      throw notFound("CONVERSATION_NOT_FOUND");
    }

    return conversation;
  }

  async function saveMessages(conversationId: string, messages: UIMessage[]) {
    const { now } = clock;
    await db
      .insert(conversationTable)
      .values({
        id: conversationId,
        userId: (await currentUser.get()).id,
        messages,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: conversationTable.id,
        set: { messages, updatedAt: now },
      });
  }

  async function saveTitle(conversationId: string, title: string) {
    await db
      .update(conversationTable)
      .set({ title, updatedAt: clock.now })
      .where(eq(conversationTable.id, conversationId));
  }

  return { execute };
}

async function generateTitle(
  model: AssistantCallSettings["model"],
  messages: UIMessage[]
) {
  const transcript = messages
    .map(
      ({ role, parts }) =>
        `${role}: ${parts.map((part) => (part.type === "text" ? part.text : "")).join("")}`
    )
    .join("\n\n");

  const { text } = await generateText({
    model,
    instructions:
      "Write a title of a few words for the conversation transcript the user sends, in its language. Do not answer or continue the conversation. Answer with the title only.",
    prompt: transcript,
  });

  return text.trim();
}
