import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import {
  EffortSchema,
  ModelSchema,
} from "@server/lib/model-providers/model-provider.dto";
import { z } from "zod";

import {
  AgentCapabilitiesSchema,
  AgentDescriptionSchema,
  AgentPromptSchema,
  AgentSkillIdsSchema,
  AgentTriggersSchema,
} from "./agent.dto";

export const AgentUpdateRequest = z
  .object({
    name: z.string().trim().min(1),
    description: AgentDescriptionSchema.nullable(),
    modelProviderId: z.uuid(),
    model: ModelSchema,
    effort: EffortSchema,
    harness: HarnessNameSchema,
    prompt: AgentPromptSchema,
    skillIds: AgentSkillIdsSchema,
    triggers: AgentTriggersSchema,
    capabilities: AgentCapabilitiesSchema,
  })
  .partial();

export type AgentUpdateRequestDto = z.infer<typeof AgentUpdateRequest>;
