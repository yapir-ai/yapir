import { executionReader } from "@server/lib/auth/execution-reader";
import { tool } from "@server/lib/tools/capability-definition";
import type {
  CapabilityDefinition,
  ScopeDescriptions,
} from "@server/lib/tools/capability-definition";

import { configurationReadTools, taskReadTools } from "./yapir-read-tools";
import type { ReadServices, ReadTool } from "./yapir-read-tools";

const provider = { id: "yapir", label: "Yapir" };

const taskScope = {
  scoped:
    "Its scope: the tasks of this automation, with their events, executions and transcripts.",
  unscoped: "Its scope: the tasks of every automation of this project.",
};

const configurationScope = {
  scoped:
    "Its scope: this automation, its agent, the agent's skills and this project.",
  unscoped:
    "Its scope: the automations of this project, and the agents and skills of the organization.",
};

function executionTools(
  readTools: Record<string, ReadTool>,
  scopeDescriptions: ScopeDescriptions,
  services: Omit<ReadServices, "currentUser">
) {
  return Object.entries(readTools).map(([key, readTool]) =>
    tool({
      name: `yapir_${key.replaceAll(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)}`,
      description: readTool.description,
      inputSchema: readTool.inputSchema,
      scopeDescriptions,
      execute: async (input, context) =>
        await readTool.read(
          { ...services, currentUser: executionReader(context.project) },
          input,
          context.unscoped ? {} : readTool.scoped(context)
        ),
    })
  );
}

export function yapirCapabilities(
  services: Omit<ReadServices, "currentUser">
): CapabilityDefinition[] {
  return [
    {
      name: "yapir.tasks.read",
      scopable: true,
      provider,
      resource: { id: "tasks", label: "Tasks" },
      label: "Read tasks",
      description:
        "List the tasks, their events and executions, and their metrics",
      tools: executionTools(taskReadTools, taskScope, services),
    },
    {
      name: "yapir.configuration.read",
      scopable: true,
      provider,
      resource: { id: "configuration", label: "Configuration" },
      label: "Read configuration",
      description:
        "List the automations, agents, skills, projects, event types and capabilities",
      tools: executionTools(
        configurationReadTools,
        configurationScope,
        services
      ),
    },
  ];
}
