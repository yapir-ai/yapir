import type { Trigger } from "@server/lib/automations/automation.dto";
import type { AutomationSelect } from "@server/lib/db/schema";
import type { RepositoryProvider } from "@server/lib/git/repository-provider";
import type { z } from "zod";

export interface ResourceReference {
  integration: string;
  host: string;
  kind: string;
  externalId: string;
}

export interface ResourcePresentation {
  label: string;
  title?: string;
  url?: string;
}

export interface CatalogMetadata {
  provider: { id: string; label: string };
  resource: { id: string; label: string };
  label: string;
  gitHost?: RepositoryProvider;
  webhookId?: string;
}

export interface EventNotification {
  id: string;
  type: string;
  payload: unknown;
}

// A resource an event concerns: it identifies the task the event continues.
export interface EventResource {
  reference: ResourceReference;
  presentation: ResourcePresentation;
}

// The Yapir agent whose effect is an event, when the provider identifies the effect.
export interface YapirAuthor {
  agentId: string;
  agentName: string;
  automationId: string;
  taskId: string;
}

export interface PreparedEvent {
  id: string;
  type: string;
  source: ResourceReference;
  // The resources its payload names, or the event itself when it names none: never empty.
  resources: EventResource[];
  data: Record<string, z.core.util.JSONType>;
  // It does not reactivate the author's automation.
  author: YapirAuthor | null;
}

// What a task receives of an event.
export type EventNotificationData = Pick<
  PreparedEvent,
  "type" | "data" | "author"
>;

// How an accepted event reads in a task's timeline.
export interface EventPresentation {
  // A Yapir agent or user is identified by its ID, a person of a provider by their avatar.
  actor?: {
    name: string;
    agentId?: string;
    userId?: string;
    avatarUrl?: string;
    url?: string;
  };
  resource?: ResourcePresentation;
  detail?: string;
  excerpt?: string;
  url?: string;
}

export interface TriggerFilter {
  // The reason the trigger cannot filter this event type, if any.
  check: (trigger: Trigger) => string | undefined;
  matches: (
    trigger: Trigger,
    event: PreparedEvent,
    task: { id: string } | null
  ) => boolean;
}

export interface EventDefinition {
  type: string;
  label: string;
  capabilities: readonly string[];
  schema: z.ZodType;
  present: (
    data: PreparedEvent["data"],
    author: YapirAuthor | null
  ) => EventPresentation;
}

// An event that triggers can select: received from an integration and matched against automations.
export interface TriggerEventDefinition
  extends EventDefinition, CatalogMetadata {
  prepare: (
    notification: EventNotification
  ) => PreparedEvent | Promise<PreparedEvent>;
  findCandidates: (event: PreparedEvent) => Promise<AutomationSelect[]>;
  filter: TriggerFilter;
}

export interface EventTarget {
  automationId: string;
  task: { id: string } | null;
}

export interface AddressedEventDefinition extends EventDefinition {
  address: (
    notification: EventNotification
  ) => Promise<{ event: PreparedEvent; targets: EventTarget[] }>;
}

export type EventRegistry = ReadonlyMap<
  string,
  TriggerEventDefinition | AddressedEventDefinition
>;

export type TriggerEventRegistry = ReadonlyMap<string, TriggerEventDefinition>;
