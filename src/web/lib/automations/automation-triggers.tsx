import type { Trigger } from "@server/lib/automations/automation.dto";
import type { EventDefinition } from "@web/lib/events/event-catalog.collection";

export function AutomationTriggers({
  triggers,
  events,
}: {
  triggers: Trigger[];
  events: EventDefinition[];
}) {
  const [first, ...others] = triggers;
  const event = events.find(({ type }) => type === first?.type);

  return (
    first && (
      <>
        {event ? `${event.resource.label} · ${event.label}` : first.type}
        {others.length > 0 && ` +${others.length}`}
      </>
    )
  );
}
