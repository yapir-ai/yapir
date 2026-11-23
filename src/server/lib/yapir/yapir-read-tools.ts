import { AgentListRequest } from "@server/lib/agents/agent-list.dto";
import { agentListOperation } from "@server/lib/agents/agent-list.operation";
import type { CurrentUser } from "@server/lib/auth/current-user";
import { AutomationListRequest } from "@server/lib/automations/automation-list.dto";
import { automationListOperation } from "@server/lib/automations/automation-list.operation";
import type { Clock } from "@server/lib/clock/clock";
import type { Db } from "@server/lib/db";
import { eventCatalogListOperation } from "@server/lib/events/event-catalog-list.operation";
import type {
  EventRegistry,
  TriggerEventRegistry,
} from "@server/lib/events/event-definition";
import { celContextDescription } from "@server/lib/events/event-filter.context";
import { EventListRequest } from "@server/lib/events/event-list.dto";
import { eventListOperation } from "@server/lib/events/event-list.operation";
import { ExecutionListRequest } from "@server/lib/executions/execution-list.dto";
import { executionListOperation } from "@server/lib/executions/execution-list.operation";
import { EffectMetricsRequest } from "@server/lib/metrics/effect-metrics.dto";
import { effectMetricsOperation } from "@server/lib/metrics/effect-metrics.operation";
import { ExecutionMetricsRequest } from "@server/lib/metrics/execution-metrics.dto";
import { executionMetricsOperation } from "@server/lib/metrics/execution-metrics.operation";
import { ProjectListRequest } from "@server/lib/projects/project-list.dto";
import { projectListOperation } from "@server/lib/projects/project-list.operation";
import { SkillListRequest } from "@server/lib/skills/skill-list.dto";
import { skillListOperation } from "@server/lib/skills/skill-list.operation";
import { TaskListRequest } from "@server/lib/tasks/task-list.dto";
import { taskListOperation } from "@server/lib/tasks/task-list.operation";
import type {
  CapabilityRegistry,
  ToolContext,
} from "@server/lib/tools/capability-definition";
import { capabilityListOperation } from "@server/lib/tools/capability-list.operation";
import { z } from "zod";

// What a read needs. `currentUser` reads: the user for the Assistant, the execution's reader for an execution.
export interface ReadServices {
  db: Db;
  clock: Clock;
  currentUser: CurrentUser;
  eventRegistry: Promise<EventRegistry>;
  triggerEventRegistry: Promise<TriggerEventRegistry>;
  capabilityRegistry: Promise<CapabilityRegistry>;
}

type Pins = Partial<Record<string, string[]>>;

export interface ReadTool {
  description: string;
  inputSchema: z.ZodObject;
  scoped: (context: ToolContext) => Pins;
  // The adapters validate the input with `inputSchema`: `read` parses it again to type it.
  read: (
    services: ReadServices,
    input: z.output<z.ZodObject>,
    pins?: Pins
  ) => Promise<object>;
}

// Each pinned filter keeps only the requested IDs that it pins: an empty intersection reads nothing.
function narrow<Input extends Record<string, unknown>>(
  input: Input,
  pins: Pins
) {
  return {
    ...input,
    ...Object.fromEntries(
      Object.entries(pins).map(([key, ids = []]) => {
        const requested = input[key];

        return [
          key,
          Array.isArray(requested)
            ? ids.filter((id) => requested.includes(id))
            : ids,
        ];
      })
    ),
  };
}

function readTool<Input extends z.ZodObject>({
  description,
  inputSchema,
  scoped,
  execute,
}: {
  description: string;
  inputSchema: Input;
  scoped: (
    context: ToolContext
  ) => Partial<Record<keyof z.output<Input>, string[]>>;
  execute: (services: ReadServices, input: z.output<Input>) => Promise<object>;
}): ReadTool {
  return {
    description,
    inputSchema,
    scoped,
    read: async (services, input, pins = {}) =>
      await execute(services, narrow(inputSchema.parse(input), pins)),
  };
}

const ownTasks = ({ automation }: ToolContext) => ({
  automationId: [automation.id],
});

const catalog = () => ({});

// The keys are the Assistant's tool names.
export const taskReadTools = {
  taskList: readTool({
    description:
      "List tasks: each is the work of an automation toward one objective, with its state, cost and associated resources.",
    inputSchema: TaskListRequest,
    scoped: ownTasks,
    execute: async (services, request) =>
      await taskListOperation(services).execute(request),
  }),
  eventList: readTool({
    description:
      "List the events that tasks accepted, newest first. A `yapir.message` event is a message of a user to the agent. Each `data` is what CEL evaluates as `event`: for examples of a type, filter by `type` with `distinct: eventId` and a small `limit`. Yapir stores only the events that a task accepted, so a type can have no example yet.",
    inputSchema: EventListRequest,
    scoped: ownTasks,
    execute: async (services, request) =>
      await eventListOperation(services).execute(request),
  }),
  executionList: readTool({
    description:
      "List executions: each activation of an agent to advance a task, with its outcome, model, harness, tokens and cost.",
    inputSchema: ExecutionListRequest,
    scoped: ownTasks,
    execute: async (services, request) =>
      await executionListOperation(services).execute(request),
  }),
  executionMetrics: readTool({
    description:
      "Measure the executions of the last 30 days: counts, outcomes, tokens, cost and duration, by dimension and period.",
    inputSchema: ExecutionMetricsRequest,
    scoped: ownTasks,
    execute: async (services, request) =>
      await executionMetricsOperation(services).execute(request),
  }),
  effectMetrics: readTool({
    description:
      "Count the effects of the executions of the last 30 days, such as comments and change requests, by dimension and period.",
    inputSchema: EffectMetricsRequest,
    scoped: ownTasks,
    execute: async (services, request) =>
      await effectMetricsOperation(services).execute(request),
  }),
};

export const configurationReadTools = {
  automationList: readTool({
    description:
      "List automations: each brings together an agent, instructions, triggers and capabilities in a project.",
    inputSchema: AutomationListRequest,
    scoped: ({ automation }) => ({ id: [automation.id] }),
    execute: async (services, request) =>
      await automationListOperation(services).execute(request),
  }),
  agentList: readTool({
    description:
      "List agents: reusable instructions, model and harness, independent of any project.",
    inputSchema: AgentListRequest,
    scoped: ({ agent }) => ({ id: [agent.id] }),
    execute: async (services, request) =>
      await agentListOperation(services).execute(request),
  }),
  skillList: readTool({
    description:
      "List skills: instructions in the Agent Skills format that agents select.",
    inputSchema: SkillListRequest,
    scoped: ({ agent }) => ({ id: agent.skillIds }),
    execute: async (services, request) =>
      await skillListOperation(services).execute(request),
  }),
  projectList: readTool({
    description:
      "List projects: each groups repositories with their automations, members and instructions.",
    inputSchema: ProjectListRequest,
    scoped: ({ project }) => ({ id: [project.id] }),
    execute: async (services, request) =>
      await projectListOperation(services).execute(request),
  }),
  eventCatalogList: readTool({
    description: `List the event types triggers can select: label, payload JSON Schema, and the capabilities an automation gets with a trigger on it. ${celContextDescription}`,
    inputSchema: z.object({}),
    scoped: catalog,
    execute: async (services) =>
      await eventCatalogListOperation(services).execute(),
  }),
  capabilityList: readTool({
    description: "List the tool capabilities an automation can grant.",
    inputSchema: z.object({}),
    scoped: catalog,
    execute: async (services) =>
      await capabilityListOperation(services).execute(),
  }),
};
