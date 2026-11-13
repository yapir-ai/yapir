import type {
  EventDefinition,
  PreparedEvent,
  ResourceReference,
} from "@server/lib/events/event-definition";

// A moment in UTC, to the minute: cron patterns run in UTC.
export const occurrenceFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
  timeZoneName: "short",
});

// An event that is its own resource: it starts its own task.
export function standaloneEvent({
  id,
  type,
  resource,
  label,
  data,
}: {
  id: string;
  type: string;
  resource: ResourceReference;
  label: string;
  data: PreparedEvent["data"];
}): PreparedEvent {
  return {
    id,
    type,
    source: resource,
    resources: [{ reference: resource, presentation: { label } }],
    data,
    author: null,
  };
}

export function yapirEvent(
  id: string,
  kind: string,
  definition: Pick<EventDefinition, "type" | "label">,
  data: PreparedEvent["data"]
) {
  return standaloneEvent({
    id: `yapir:${kind}:${id}`,
    type: definition.type,
    resource: { integration: "yapir", host: "yapir", kind, externalId: id },
    label: definition.label,
    data,
  });
}
