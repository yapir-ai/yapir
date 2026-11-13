import type { Chat } from "@ai-sdk/react";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Link } from "@tanstack/react-router";
import { Markdown } from "@web/components/markdown";
import { MessageComposer } from "@web/components/message-composer";
import { Bubble, BubbleContent } from "@web/components/ui/bubble";
import { Button, buttonVariants } from "@web/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Message, MessageContent } from "@web/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@web/components/ui/message-scroller";
import { Status } from "@web/components/ui/status";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import type { UIMessage } from "ai";
import { CircleAlert, Sparkles } from "lucide-react";

import { useAssistantChat } from "./assistant-chat";
import { AssistantMarkdownLink } from "./assistant-markdown-link";
import {
  AssistantThinking,
  AssistantTrace,
  groupAssistantMessageParts,
} from "./assistant-trace";

const markdownComponents = { a: AssistantMarkdownLink };

const suggestions = [
  "How do I set up a code review agent?",
  "Which events can trigger an automation?",
  "How do I connect my coding agent to Yapir?",
  "What can I do on this page?",
];

export function AssistantConversation({ chat }: { chat: Chat<UIMessage> }) {
  const { data: defaults } = useLiveSuspenseQuery(defaultsQuery());

  return defaults?.modelProviderId ? (
    <AssistantChat chat={chat} />
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>The Assistant is not configured</EmptyTitle>
        <EmptyDescription>
          An Organization Admin must choose the default model, with which the
          Assistant answers.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/defaults" className={buttonVariants()}>
          Configure defaults
        </Link>
      </EmptyContent>
    </Empty>
  );
}

function AssistantChat({ chat }: { chat: Chat<UIMessage> }) {
  const { messages, status, error, send, stop } = useAssistantChat(chat);
  const answering = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);

  const thinking =
    answering &&
    !(
      lastMessage?.role === "assistant" &&
      groupAssistantMessageParts(lastMessage.parts).length > 0
    );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles />
              </EmptyMedia>
              <EmptyTitle>Ask the Assistant</EmptyTitle>
              <EmptyDescription>
                Questions about Yapir and guidance through its configuration.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent aria-busy={answering}>
                  {messages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === "user"}
                    >
                      <AssistantMessage
                        message={message}
                        streaming={answering && message === lastMessage}
                      />
                    </MessageScrollerItem>
                  ))}
                  {thinking && (
                    <MessageScrollerItem>
                      <AssistantThinking />
                    </MessageScrollerItem>
                  )}
                  {error && (
                    <MessageScrollerItem>
                      <Status tone="destructive">
                        <CircleAlert />
                        {error.message}
                      </Status>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>
      {messages.length === 0 && <AssistantSuggestions onSend={send} />}
      <AssistantComposer busy={answering} onSend={send} onStop={stop} />
    </div>
  );
}

function AssistantMessage({
  message,
  streaming,
}: {
  message: UIMessage;
  streaming: boolean;
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent className="whitespace-pre-wrap">
              {message.parts.map((part) =>
                part.type === "text" ? part.text : ""
              )}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message>
      <MessageContent>
        {groupAssistantMessageParts(message.parts).map((part, index) =>
          part.type === "text" ? (
            <Markdown
              key={index}
              components={markdownComponents}
              isAnimating={streaming}
            >
              {part.text}
            </Markdown>
          ) : (
            <AssistantTrace
              key={index}
              steps={part.steps}
              streaming={streaming}
            />
          )
        )}
      </MessageContent>
    </Message>
  );
}

export function AssistantSuggestions({
  onSend,
}: {
  onSend: (text: string) => Promise<void>;
}) {
  return (
    <div className="scroll-fade-x flex scrollbar-none gap-2 overflow-x-auto overscroll-x-contain">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            void onSend(suggestion);
          }}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}

export function AssistantComposer({
  busy,
  onSend,
  onStop,
}: {
  busy: boolean;
  onSend: (text: string) => Promise<void>;
  onStop: () => Promise<void>;
}) {
  return (
    <MessageComposer
      placeholder="Ask the Assistant"
      autoFocus
      busy={busy}
      onSend={onSend}
      onStop={onStop}
    />
  );
}
