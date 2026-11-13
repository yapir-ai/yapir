import { useLiveQuery } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import { defaultsQuery } from "@web/lib/defaults/defaults.queries";
import { generateId } from "ai";
import { Sparkles } from "lucide-react";
import { createContext, use, useCallback, useState } from "react";
import type { ReactNode } from "react";

import { createChat, useCurrentAssistantChat } from "./assistant-chat";

// The help a field offers: the Assistant's opening message, and what the model knows without showing it.
interface AssistantNudge {
  message: string;
  context: string;
}

const AssistantNudgeContext = createContext<
  | {
      nudge: AssistantNudge | undefined;
      setNudge: (nudge: AssistantNudge | undefined) => void;
    }
  | undefined
>(undefined);

export function AssistantNudgeProvider({ children }: { children: ReactNode }) {
  const [nudge, setNudge] = useState<AssistantNudge>();

  return (
    // oxlint-disable-next-line react/jsx-no-constructed-context-values React Compiler memoizes it
    <AssistantNudgeContext value={{ nudge, setNudge }}>
      {children}
    </AssistantNudgeContext>
  );
}

export function useCurrentAssistantNudge() {
  return use(AssistantNudgeContext)!;
}

export function useNudgeOffer() {
  const { setChat, dockOpen, setDockOpen } = useCurrentAssistantChat();
  const { data: defaults } = useLiveQuery(defaultsQuery());

  return {
    offered: !!defaults?.modelProviderId && !dockOpen,
    open: (nudge: AssistantNudge) => {
      setChat(createNudgeChat(nudge));
      setDockOpen(true);
    },
  };
}

export function AssistantNudgeField({
  nudge,
  children,
}: {
  nudge: AssistantNudge;
  children: ReactNode;
}) {
  const { setNudge } = useCurrentAssistantNudge();
  const offer = useNudgeOffer();
  // A field removed with the focus, by Escape or a navigation, gets no blur. A stable ref cleanup runs only on removal.
  const ref = useCallback(() => () => setNudge(undefined), [setNudge]);

  return (
    <div
      ref={ref}
      className="grid gap-2"
      onFocus={() => setNudge(nudge)}
      onBlur={() => setNudge(undefined)}
    >
      {children}
      {offer.offered && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="justify-self-start"
          onClick={() => offer.open(nudge)}
        >
          <Sparkles />
          Ask the Assistant
        </Button>
      )}
    </div>
  );
}

export function createNudgeChat({ message, context }: AssistantNudge) {
  return createChat(undefined, [
    {
      id: generateId(),
      role: "assistant",
      metadata: { context },
      parts: [{ type: "text", text: message }],
    },
  ]);
}
