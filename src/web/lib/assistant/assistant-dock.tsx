import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, useMatches } from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import { AppDock } from "@web/components/ui/app-dock";
import { Button, buttonVariants } from "@web/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@web/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import { appHotkeys } from "@web/lib/shell/app-hotkeys";
import {
  History,
  Maximize2,
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Suspense, useState } from "react";
import type { ComponentProps } from "react";

import {
  createChat,
  loadConversationMessages,
  useConversationSaved,
  useCurrentAssistantChat,
} from "./assistant-chat";
import { AssistantConversation } from "./assistant-conversation";
import { AssistantConversationList } from "./assistant-conversation-list";
import { useCurrentAssistantNudge, useNudgeOffer } from "./assistant-nudge";

export function useOnAssistantPage() {
  return useMatches({
    select: (matches) =>
      matches.some(
        ({ routeId }) =>
          routeId === "/assistant/" || routeId === "/assistant/$conversationId"
      ),
  });
}

export function AssistantDockToggle() {
  const { dockOpen, setDockOpen } = useCurrentAssistantChat();
  const { nudge } = useCurrentAssistantNudge();
  const offer = useNudgeOffer();

  useHotkey(appHotkeys["assistant.toggle"], () => {
    if (nudge && offer.offered) {
      offer.open(nudge);
    } else {
      setDockOpen(!dockOpen);
    }
  });

  return (
    <Button
      variant="outline"
      size="sm"
      aria-expanded={dockOpen}
      onClick={() => setDockOpen(!dockOpen)}
    >
      <Sparkles />
      Assistant
      <Shortcut appHotkey={appHotkeys["assistant.toggle"]} />
    </Button>
  );
}

export function AssistantDock() {
  const [history, setHistory] = useState(false);

  const {
    chat,
    setChat,
    startConversation: startChat,
    setDockOpen,
  } = useCurrentAssistantChat();

  const saved = useConversationSaved(chat.id);

  function startNewConversation() {
    startChat();
    setHistory(false);
  }

  async function openConversation(conversationId: string) {
    if (conversationId !== chat.id) {
      setChat(
        createChat(
          conversationId,
          await loadConversationMessages(conversationId)
        )
      );
    }

    setHistory(false);
  }

  const pageLink = (
    <Link
      {...(saved
        ? {
            to: "/assistant/$conversationId",
            params: { conversationId: chat.id },
          }
        : { to: "/assistant" })}
      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
    />
  );

  return (
    <AppDock aria-label="Assistant">
      <Card className="min-w-0 flex-1">
        <CardHeader>
          <CardTitle>Assistant</CardTitle>
          <CardAction>
            <div className="flex gap-1">
              <DockAction
                label={history ? "Show the conversation" : "Show history"}
                onClick={() => setHistory(!history)}
              >
                {history ? <MessageSquare /> : <History />}
              </DockAction>
              <DockAction
                label="New conversation"
                onClick={startNewConversation}
              >
                <Plus />
              </DockAction>
              <DockAction label="Open the Assistant page" render={pageLink}>
                <Maximize2 />
              </DockAction>
              <DockAction
                label="Close the Assistant"
                onClick={() => setDockOpen(false)}
              >
                <X />
              </DockAction>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <Suspense>
            {history ? (
              <AssistantConversationList
                currentId={chat.id}
                onOpen={(conversationId) => {
                  void openConversation(conversationId);
                }}
              />
            ) : (
              <AssistantConversation chat={chat} />
            )}
          </Suspense>
        </CardContent>
      </Card>
    </AppDock>
  );
}

function DockAction({
  label,
  ...props
}: ComponentProps<typeof TooltipTrigger> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        render={<Button variant="ghost" size="icon-sm" />}
        {...props}
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
