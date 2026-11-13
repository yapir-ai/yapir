import { AgentListRequest } from "@server/lib/agents/agent-list.dto";
import type { AgentListOperation } from "@server/lib/agents/agent-list.operation";
import { AutomationInfoRequest } from "@server/lib/automations/automation-info.dto";
import type { AutomationInfoOperation } from "@server/lib/automations/automation-info.operation";
import { AutomationListRequest } from "@server/lib/automations/automation-list.dto";
import type { AutomationListOperation } from "@server/lib/automations/automation-list.operation";
import { expressionTriggerSchema } from "@server/lib/automations/automation.dto";
import type { AutomationValidator } from "@server/lib/automations/automation.validator";
import type { Content } from "@server/lib/content/content";
import type { ApiEnv } from "@server/lib/env";
import type { EventCatalogListOperation } from "@server/lib/events/event-catalog-list.operation";
import { celContextDescription } from "@server/lib/events/event-filter.context";
import { EventListRequest } from "@server/lib/events/event-list.dto";
import type { EventListOperation } from "@server/lib/events/event-list.operation";
import { ModelProviderListRequest } from "@server/lib/model-providers/model-provider-list.dto";
import type { ModelProviderListOperation } from "@server/lib/model-providers/model-provider-list.operation";
import { paginationMaxLimit } from "@server/lib/pagination/pagination.dto";
import { ProjectListRequest } from "@server/lib/projects/project-list.dto";
import type { ProjectListOperation } from "@server/lib/projects/project-list.operation";
import type { CapabilityListOperation } from "@server/lib/tools/capability-list.operation";
import { tool } from "ai";
import { z } from "zod";

// Tools call the operations as the current user: the Assistant reads what the user can read.
export function assistantTools({
  eventCatalogListOperation,
  eventListOperation,
  capabilityListOperation,
  agentListOperation,
  projectListOperation,
  automationListOperation,
  automationInfoOperation,
  modelProviderListOperation,
  automationValidator,
  env,
  content,
}: {
  eventCatalogListOperation: EventCatalogListOperation;
  eventListOperation: EventListOperation;
  capabilityListOperation: CapabilityListOperation;
  agentListOperation: AgentListOperation;
  projectListOperation: ProjectListOperation;
  automationListOperation: AutomationListOperation;
  automationInfoOperation: AutomationInfoOperation;
  modelProviderListOperation: ModelProviderListOperation;
  automationValidator: AutomationValidator;
  env: ApiEnv;
  content: Content;
}) {
  return {
    eventCatalogList: tool({
      description: `List the event types triggers can select: label, payload JSON Schema, and the capabilities an automation gets with a trigger on it. ${celContextDescription}`,
      inputSchema: z.object({}),
      execute: async () => await eventCatalogListOperation.execute(),
    }),
    eventList: tool({
      description:
        "List examples of previously accepted events of a type, newest first. Each `data` is what CEL evaluates as `event`. Only events accepted by a task are stored for now, so a type may have no example yet.",
      inputSchema: z.object({
        type: z
          .string()
          .trim()
          .min(1)
          .describe("Event type, from the event catalog"),
        projectId: z
          .uuid()
          .optional()
          .describe("Only events of this project's automations"),
        limit: z.number().int().min(1).max(paginationMaxLimit).default(3),
      }),
      execute: async (request) => {
        const { items } = await eventListOperation.execute(
          EventListRequest.parse({ ...request, distinct: "eventId" })
        );

        return items.map(({ eventId, receivedAt, data }) => ({
          eventId,
          receivedAt,
          data,
        }));
      },
    }),
    capabilityList: tool({
      description: "List the tool capabilities an automation can grant.",
      inputSchema: z.object({}),
      execute: async () => await capabilityListOperation.execute(),
    }),
    agentList: tool({
      description:
        "List agents: reusable instructions, model and harness, independent of any project.",
      inputSchema: AgentListRequest,
      execute: async (request) => await agentListOperation.execute(request),
    }),
    projectList: tool({
      description:
        "List the projects the user can read: each groups repositories with their automations, members and instructions.",
      inputSchema: ProjectListRequest,
      execute: async (request) => await projectListOperation.execute(request),
    }),
    automationList: tool({
      description:
        "List the automations the user can read, optionally by project or agent.",
      inputSchema: AutomationListRequest,
      execute: async (request) =>
        await automationListOperation.execute(request),
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
