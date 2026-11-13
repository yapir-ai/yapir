import {
  capabilitiesSchema,
  triggersSchema,
} from "@server/lib/automations/automation.dto";
import type { AgentSelect } from "@server/lib/db/schema";
import { z } from "zod";

export const AgentDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .describe("What the agent does, in one sentence");

export const AgentPromptSchema = z
  .string()
  .trim()
  .min(1)
  .describe("The agent's instructions");

export const AgentSkillIdsSchema = z
  .array(z.uuid())
  .refine((skillIds) => new Set(skillIds).size === skillIds.length, {
    message: "Select each skill once",
  })
  .describe(
    "The skills that the agent's executions receive, each with a distinct name"
  );

export const AgentTriggersSchema = triggersSchema.describe(
  "The default triggers of its automations, for every Git host: an automation created without triggers keeps those its project can use"
);

export const AgentCapabilitiesSchema = capabilitiesSchema.describe(
  "The default capabilities of its automations, for every Git host: an automation created without capabilities keeps those its project can use"
);

export const toResponseDto = (agent: AgentSelect) => ({
  id: agent.id,
  deletedAt: agent.deletedAt,
  name: agent.name,
  description: agent.description,
  modelProviderId: agent.modelProviderId,
  model: agent.model,
  effort: agent.effort,
  harness: agent.harness,
  prompt: agent.prompt,
  triggers: agent.triggers,
  capabilities: agent.capabilities,
  skillIds: agent.skillIds,
});

export type AgentResponseDto = ReturnType<typeof toResponseDto>;
