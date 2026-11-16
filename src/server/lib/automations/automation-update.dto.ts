import { DispatcherNameSchema } from "@server/lib/executions/dispatcher.dto";
import { z } from "zod";

import {
  AutomationInstructionsSchema,
  capabilitiesSchema,
  ciRepositoryIdSchema,
  triggersSchema,
} from "./automation.dto";

export const AutomationUpdateRequest = z
  .strictObject({
    name: z.string().trim().min(1),
    agentId: z.uuid(),
    enabled: z
      .boolean()
      .describe(
        "Whether events activate the agent. An enabled automation requires at least one trigger"
      ),
    instructions: AutomationInstructionsSchema,
    triggers: triggersSchema,
    capabilities: capabilitiesSchema,
    dispatcher: DispatcherNameSchema,
    ciRepositoryId: ciRepositoryIdSchema.nullable(),
  })
  .partial();

export type AutomationUpdateRequestDto = z.infer<
  typeof AutomationUpdateRequest
>;
