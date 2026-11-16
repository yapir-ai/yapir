import type { AutomationSelect } from "@server/lib/db/schema";
import { celContextDescription } from "@server/lib/events/event-filter.context";
import { scheduleTriggerSchema } from "@server/lib/schedules/schedule.trigger";
import { z } from "zod";

export const expressionTriggerSchema = z.object({
  type: z.string().trim().min(1).describe("Event type, from the event catalog"),
  expression: z
    .string()
    .trim()
    .min(1)
    .describe(`Boolean CEL expression. ${celContextDescription}`),
});

const triggerSchema = z.union([scheduleTriggerSchema, expressionTriggerSchema]);

export type Trigger = z.infer<typeof triggerSchema>;

export const triggersSchema = z
  .array(triggerSchema)
  .describe("Rules selecting the events that activate the agent");

const capabilityGrantSchema = z.object({
  name: z.string().trim().min(1).describe("From the capability list"),
  unscoped: z
    .boolean()
    .describe(
      "For a scopable capability: whether its tools reach every resource of the project's repositories, or of the Jira site, rather than only the resources associated with the Automation's Tasks"
    ),
});

export type CapabilityGrant = z.infer<typeof capabilityGrantSchema>;

export const ciRepositoryIdSchema = z
  .uuid()
  .describe("The repository of the project whose CI runs the executions");

export const capabilitiesSchema = z
  .array(capabilityGrantSchema)
  .describe(
    "Capabilities beyond those the triggers' events grant. A capability a trigger grants is listed only to unscope it"
  );

export const AutomationInstructionsSchema = z
  .string()
  .trim()
  .describe(
    "Markdown that the agent receives after the instructions of its project, such as the repository to work on"
  );

export const toResponseDto = (automation: AutomationSelect) => ({
  id: automation.id,
  deletedAt: automation.deletedAt,
  name: automation.name,
  enabled: automation.enabled,
  agentId: automation.agentId,
  projectId: automation.projectId,
  ciRepositoryId: automation.ciRepositoryId,
  instructions: automation.instructions,
  triggers: automation.triggers,
  capabilities: automation.capabilities,
  dispatcher: automation.dispatcher,
});
