import { DispatcherNameSchema } from "@server/lib/executions/dispatcher.dto";
import { z } from "zod";

import {
  capabilitiesSchema,
  ciRepositoryIdSchema,
  triggersSchema,
} from "./automation.dto";

export const AutomationCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: z.string().trim().min(1),
  agentId: z.uuid().describe("The agent the automation activates"),
  projectId: z
    .uuid()
    .describe("The project whose repositories the automation works on"),
  ciRepositoryId: ciRepositoryIdSchema
    .optional()
    .describe(
      "The repository of the project whose CI runs the executions. Defaults to the project's CI repository"
    ),
  triggers: triggersSchema
    .optional()
    .describe(
      `${triggersSchema.description}. Defaults to the agent's default triggers that the project can use`
    ),
  capabilities: capabilitiesSchema
    .optional()
    .describe(
      `${capabilitiesSchema.description}. Defaults to the agent's default capabilities that the project can use`
    ),
  dispatcher: DispatcherNameSchema.optional().describe(
    "The execution environment, from the dispatcher list. Defaults to the CI of the CI repository's Git host"
  ),
});

export type AutomationCreateRequestDto = z.infer<
  typeof AutomationCreateRequest
>;
