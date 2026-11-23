import { AutomationInfoRequest } from "@server/lib/automations/automation-info.dto";
import type { AutomationInfoOperation } from "@server/lib/automations/automation-info.operation";
import { expressionTriggerSchema } from "@server/lib/automations/automation.dto";
import type { AutomationValidator } from "@server/lib/automations/automation.validator";
import type { Content } from "@server/lib/content/content";
import type { ApiEnv } from "@server/lib/env";
import { celContextDescription } from "@server/lib/events/event-filter.context";
import { ModelProviderListRequest } from "@server/lib/model-providers/model-provider-list.dto";
import type { ModelProviderListOperation } from "@server/lib/model-providers/model-provider-list.operation";
import {
  configurationReadTools,
  taskReadTools,
} from "@server/lib/yapir/yapir-read-tools";
import type { ReadServices } from "@server/lib/yapir/yapir-read-tools";
import { tool } from "ai";
import { z } from "zod";

function assistantReadTools(services: ReadServices) {
  return Object.fromEntries(
    Object.entries({ ...taskReadTools, ...configurationReadTools }).map(
      ([name, { description, inputSchema, read }]) => [
        name,
        tool({
          description,
          inputSchema,
          execute: async (input) => await read(services, input),
        }),
      ]
    )
  );
}

export function assistantTools({
  db,
  clock,
  currentUser,
  eventRegistry,
  triggerEventRegistry,
  capabilityRegistry,
  automationInfoOperation,
  modelProviderListOperation,
  automationValidator,
  env,
  content,
}: ReadServices & {
  automationInfoOperation: AutomationInfoOperation;
  modelProviderListOperation: ModelProviderListOperation;
  automationValidator: AutomationValidator;
  env: ApiEnv;
  content: Content;
}) {
  return {
    ...assistantReadTools({
      db,
      clock,
      currentUser,
      eventRegistry,
      triggerEventRegistry,
      capabilityRegistry,
    }),
    automationInfo: tool({
      description: "Read an automation.",
      inputSchema: AutomationInfoRequest,
      execute: async (request) =>
        await automationInfoOperation.execute(request),
    }),
    modelProviderList: tool({
      description: "List model providers.",
      inputSchema: ModelProviderListRequest,
      execute: async (request) =>
        await modelProviderListOperation.execute(request),
    }),
    validateCel: tool({
      description: `Check a trigger's CEL expression for its event type, as automation validation does. Fails with the reason when invalid. ${celContextDescription}`,
      inputSchema: expressionTriggerSchema,
      execute: async (trigger) => {
        await automationValidator.validateTrigger(trigger);

        return { valid: true };
      },
    }),
    contentInfo: tool({
      description:
        "Read a document of Yapir content, by its path in the content index.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "Path in the content index, such as `connections/github.md`"
          ),
      }),
      execute: ({ path }) => content.info(path, env.SERVER_URL),
    }),
  };
}

export type AssistantTools = ReturnType<typeof assistantTools>;
