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

export const AgentCreateRequest = z.object({
  id: z.uuidv7().optional(),
  name: z.string().trim().min(1),
  description: AgentDescriptionSchema.optional(),
  modelProviderId: z.uuid(),
  model: ModelSchema,
  effort: EffortSchema.optional(),
  harness: HarnessNameSchema,
  prompt: AgentPromptSchema,
  skillIds: AgentSkillIdsSchema.optional(),
  triggers: AgentTriggersSchema.optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
});

export type AgentCreateRequestDto = z.infer<typeof AgentCreateRequest>;
