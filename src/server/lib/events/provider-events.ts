import type { z } from "zod";

import type {
  CatalogMetadata,
  EventPresentation,
  PreparedEvent,
  TriggerEventDefinition,
  YapirAuthor,
} from "./event-definition";

// A provider's webhook: each of its actions is an event type, named and shaped as the provider's.
export interface ProviderWebhook<T extends z.ZodType<PreparedEvent["data"]>>
  extends
    Omit<CatalogMetadata, "label">,
    Pick<TriggerEventDefinition, "findCandidates" | "filter"> {
  // The provider and its webhook's name, such as github.pull_request.
  type: string;
  // Empty when the webhook has no action.
  actions: readonly string[];
  schema: T;
  capabilities: readonly string[];
  prepare: (
    id: string,
    data: z.infer<T>
  ) => Promise<Omit<PreparedEvent, "type" | "data">>;
  present: (data: z.infer<T>, author: YapirAuthor | null) => EventPresentation;
}

export function providerEvents<T extends z.ZodType<PreparedEvent["data"]>>({
  type,
  actions,
  schema,
  prepare,
  present,
  ...metadata
}: ProviderWebhook<T>): TriggerEventDefinition[] {
  const name = type.slice(type.indexOf(".") + 1);

  const types =
    actions.length > 0
      ? actions.map((action) => ({ type: `${type}.${action}`, label: action }))
      : [{ type, label: name }];

  return types.map((event) => ({
    ...metadata,
    ...event,
    schema,
    async prepare({ id, payload }) {
      const data = schema.parse(payload);

      return { ...(await prepare(id, data)), type: event.type, data };
    },
    present: (data, author) => present(schema.parse(data), author),
  }));
}

// Yapir agents act as the provider's account: their attribution names the agent.
export function eventActor(
  author: YapirAuthor | null,
  person: EventPresentation["actor"]
) {
  return author ? { name: author.agentName, agentId: author.agentId } : person;
}
