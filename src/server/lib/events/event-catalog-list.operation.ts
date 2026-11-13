import { z } from "zod";

import type { TriggerEventRegistry } from "./event-definition";

export function eventCatalogListOperation({
  triggerEventRegistry,
}: {
  triggerEventRegistry: Promise<TriggerEventRegistry>;
}) {
  async function execute() {
    return [...(await triggerEventRegistry).values()].map((definition) => ({
      type: definition.type,
      provider: definition.provider,
      resource: definition.resource,
      label: definition.label,
      schema: z.toJSONSchema(definition.schema),
      capabilities: definition.capabilities,
      gitHost: definition.gitHost,
      webhookId: definition.webhookId,
    }));
  }

  return { execute };
}

export type EventCatalogListOperation = ReturnType<
  typeof eventCatalogListOperation
>;
