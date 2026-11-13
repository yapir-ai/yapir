import { attemptState } from "@server/lib/executions/execution.dto";
import { taskMessageEventType } from "@server/lib/tasks/task-message.event";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useLocation } from "@tanstack/react-router";
import { Markdown } from "@web/components/markdown";
import { Bubble, BubbleContent } from "@web/components/ui/bubble";
import { CodeBlock, CodeBlockContent } from "@web/components/ui/code-block";
import {
  Disclosure,
  DisclosureContent,
  DisclosureHeader,
  DisclosureMeta,
  DisclosureSummary,
  DisclosureTrigger,
} from "@web/components/ui/disclosure";
import { Link } from "@web/components/ui/link";
import { RelativeTime } from "@web/components/ui/relative-time";
import { Status } from "@web/components/ui/status";
import {
  Timeline,
  TimelineItem,
  TimelineLabel,
  TimelineQuote,
} from "@web/components/ui/timeline";
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceLine,
  TraceTitle,
} from "@web/components/ui/trace";
import { useNow } from "@web/hooks/use-now";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { effectKey } from "@web/lib/effects/effect.collection";
import type { Effect } from "@web/lib/effects/effect.collection";
import type { TaskEvent } from "@web/lib/events/event.collection";
import type { ExecutionMessage } from "@web/lib/executions/execution-message.collection";
import { ExecutionState } from "@web/lib/executions/execution-state";
import {
  ExecutionTranscript,
  transcriptParts,
} from "@web/lib/executions/execution-transcript";
import type { Execution } from "@web/lib/executions/execution.collection";
import { UserAvatar } from "@web/lib/users/user-avatar";
import { userInfoQuery } from "@web/lib/users/user.queries";
import type { UIMessage } from "ai";
import { Clock } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { effectKinds } from "./effect-kind";
import {
  activeExecution,
  executionActivity,
  executionUsage,
  taskResourceLabel,
} from "./task.presentation";
import type { ResourcePresentation } from "./task.presentation";

type Actor = NonNullable<TaskEvent["presentation"]["actor"]>;

export function TaskTimeline({
  executions,
  events,
  effects,
  messages,
}: {
  executions: Execution[];
  events: TaskEvent[];
  effects: Effect[];
  messages: ExecutionMessage[];
}) {
  const active = activeExecution(executions);

  const blocks = executions.map((execution) => ({
    execution,
    // Pending events wait for the active execution, which processes them as further turns.
    events: events.filter(
      (event) =>
        event.executionId === execution.id ||
        (execution === active && event.executionId === null)
    ),
    effects: effects.filter((effect) => effect.executionId === execution.id),
    // The events stand for the prompts: the transcript adds the agent's work.
    parts: transcriptParts(
      messages
        .filter(
          ({ executionId, message }) =>
            executionId === execution.id && message.role === "assistant"
        )
        .map(({ message }) => message)
    ),
  }));

  const pending = active
    ? []
    : events.filter((event) => event.executionId === null);

  const hash = useLocation({ select: (location) => location.hash });

  return (
    <ol aria-label="Executions" className="grid grid-cols-1 gap-3">
      {blocks.map((block, index) => (
        <li key={block.execution.id}>
          <ExecutionGroup
            {...block}
            defaultOpen={
              index === blocks.length - 1 ||
              hash === executionAnchor(block.execution) ||
              block.events.some((event) => hash === eventAnchor(event))
            }
          />
        </li>
      ))}
      {pending.length > 0 && (
        <li>
          <PendingEvents events={pending} />
        </li>
      )}
    </ol>
  );
}

const executionAnchor = ({ id }: Execution) => `execution-${id}`;
const eventAnchor = ({ eventId }: TaskEvent) => `event-${eventId}`;

const executionTones = {
  queued: "info",
  running: "info",
  succeeded: "default",
  failed: "destructive",
  stopped: "default",
} as const;

function ExecutionGroup({
  execution,
  events,
  effects,
  parts,
  defaultOpen,
}: {
  execution: Execution;
  events: TaskEvent[];
  effects: Effect[];
  parts: UIMessage["parts"];
  defaultOpen: boolean;
}) {
  const state = attemptState(execution);
  const now = useNow(state === "running");
  const [open, setOpen] = useState(defaultOpen);
  const [trigger] = events;

  return (
    <Disclosure
      id={executionAnchor(execution)}
      open={open}
      onOpenChange={setOpen}
      tone={executionTones[state]}
    >
      <DisclosureHeader>
        <DisclosureTrigger>
          <ExecutionState state={state} className="shrink-0">
            {executionActivity(execution, now)}
            {execution.stoppedById && (
              <>
                {" by "}
                <UserActor userId={execution.stoppedById} />
              </>
            )}
          </ExecutionState>
          {trigger && (
            <DisclosureSummary>{eventSummary(trigger)}</DisclosureSummary>
          )}
          <DisclosureMeta>
            {executionUsage(execution).join(" · ")}
          </DisclosureMeta>
        </DisclosureTrigger>
        <Permalink
          anchor={executionAnchor(execution)}
          date={execution.startedAt ?? execution.queuedAt}
        />
      </DisclosureHeader>
      <DisclosureContent>
        <Timeline>
          {events.map((event) => (
            <EventItem key={event.eventId} event={event} />
          ))}
          <ExecutionItem execution={execution} parts={parts} />
          {effects.map((effect) => (
            <EffectItem key={effectKey(effect)} effect={effect} />
          ))}
        </Timeline>
      </DisclosureContent>
    </Disclosure>
  );
}

function eventSummary({ label, presentation }: TaskEvent) {
  const { actor, resource, excerpt } = presentation;
  const detail = excerpt ?? (resource && taskResourceLabel(resource));

  return [actor ? `${label} by ${actor.name}` : label, detail]
    .filter(Boolean)
    .join(" · ");
}

function PendingEvents({ events }: { events: TaskEvent[] }) {
  return (
    <Disclosure defaultOpen tone="info">
      <DisclosureHeader>
        <DisclosureTrigger>
          <Status tone="info">
            <Clock aria-hidden="true" /> Waiting for an execution
          </Status>
        </DisclosureTrigger>
      </DisclosureHeader>
      <DisclosureContent>
        <Timeline>
          {events.map((event) => (
            <EventItem key={event.eventId} event={event} />
          ))}
        </Timeline>
      </DisclosureContent>
    </Disclosure>
  );
}

function Permalink({ anchor, date }: { anchor: string; date: string }) {
  return (
    <Link to="." hash={anchor} variant="muted" aria-label="Link to this item">
      <RelativeTime date={date} />
    </Link>
  );
}

const eventStateLabels = {
  pending: "Pending",
  delivered: "Delivered",
  acknowledged: "Acknowledged",
} as const;

function EventItem({ event }: { event: TaskEvent }) {
  const { actor, resource, detail, excerpt, url } = event.presentation;
  const hash = useLocation({ select: (location) => location.hash });

  return (
    <TimelineItem
      id={eventAnchor(event)}
      highlighted={hash === eventAnchor(event)}
      time={<Permalink anchor={eventAnchor(event)} date={event.receivedAt} />}
    >
      <p>
        {url ? (
          <Link to={url} target="_blank" rel="noreferrer">
            {event.label}
          </Link>
        ) : (
          <TimelineLabel>{event.label}</TimelineLabel>
        )}
        {actor && (
          <>
            {" by "}
            <EventActor actor={actor} />
          </>
        )}
        {resource && (
          <>
            {" · "}
            <ResourceLink presentation={resource} />
          </>
        )}
        {detail && ` · ${detail}`}
        <span className="text-muted-foreground">
          {" · "}
          {eventStateLabels[event.state]}
        </span>
      </p>
      {excerpt &&
        (event.type === taskMessageEventType ? (
          <Bubble variant="muted">
            <BubbleContent className="whitespace-pre-wrap">
              {excerpt}
            </BubbleContent>
          </Bubble>
        ) : (
          <TimelineQuote>{excerpt}</TimelineQuote>
        ))}
    </TimelineItem>
  );
}

function EventActor({ actor }: { actor: Actor }) {
  if (actor.userId) {
    return <UserActor userId={actor.userId} name={actor.name} />;
  }

  if (actor.agentId) {
    return (
      <ActorLabel>
        <AgentIcon agent={{ id: actor.agentId }} size="xs" />
        <Link to="/agents/$agentId" params={{ agentId: actor.agentId }}>
          {actor.name}
        </Link>
      </ActorLabel>
    );
  }

  return (
    <ActorLabel>
      <UserAvatar
        seed={actor.name}
        image={actor.avatarUrl}
        className="size-5"
      />
      {actor.url ? (
        <Link to={actor.url} target="_blank" rel="noreferrer">
          {actor.name}
        </Link>
      ) : (
        actor.name
      )}
    </ActorLabel>
  );
}

function UserActor({ userId, name }: { userId: string; name?: string }) {
  const { data: user } = useLiveSuspenseQuery(userInfoQuery(userId));

  return (
    <ActorLabel>
      <UserAvatar
        seed={user?.email ?? userId}
        image={user?.image}
        className="size-5"
      />
      {user?.name ?? name}
    </ActorLabel>
  );
}

function ActorLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-bottom">
      {children}
    </span>
  );
}

function ExecutionItem({
  execution,
  parts,
}: {
  execution: Execution;
  parts: UIMessage["parts"];
}) {
  const last = parts.at(-1);
  const answer = last?.type === "text" ? last : undefined;
  const work = answer ? parts.slice(0, -1) : parts;
  const running = attemptState(execution) === "running";

  if (work.length === 0 && !execution.error && !answer) {
    return null;
  }

  return (
    <TimelineItem variant="outline">
      {work.length > 0 && (
        <TraceCollapsible
          defaultOpen={running || execution.outcome === "failed"}
        >
          <TraceCollapsibleTrigger>
            <TraceLine status={running ? "running" : undefined}>
              <TraceTitle>
                Transcript · {work.length}{" "}
                {work.length === 1 ? "step" : "steps"}
              </TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <ExecutionTranscript parts={work} running={running} />
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
      {execution.error && (
        <CodeBlock variant="destructive" size="sm">
          <CodeBlockContent wrap>{execution.error}</CodeBlockContent>
        </CodeBlock>
      )}
      {answer && <Markdown>{answer.text}</Markdown>}
    </TimelineItem>
  );
}

function EffectItem({ effect }: { effect: Effect }) {
  return (
    <TimelineItem variant="nested">
      <span>
        {effectKinds.get(effect.kind)?.action}{" "}
        <ResourceLink presentation={effect.presentation} />
      </span>
    </TimelineItem>
  );
}

function ResourceLink({
  presentation,
}: {
  presentation: ResourcePresentation;
}) {
  const label = taskResourceLabel(presentation);

  return presentation.url ? (
    <Link to={presentation.url} target="_blank" rel="noreferrer">
      {label}
    </Link>
  ) : (
    label
  );
}
