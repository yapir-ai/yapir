import { McpServer } from "@modelcontextprotocol/server";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { EventRegistry } from "@server/lib/events/event-definition";
import type { TaskService } from "@server/lib/tasks/task.service";
import { createMcpHandler } from "agents/mcp/server";

import type {
  CapabilityDefinition,
  CapabilityRegistry,
  ToolDefinition,
  ToolScope,
} from "./capability-definition";

function grantScope(
  capability: CapabilityDefinition | undefined,
  unscoped: boolean
): ToolScope {
  if (capability?.scopable) {
    return unscoped ? "unscoped" : "scoped";
  }
}

export function taskMcpOperation({
  taskService,
  eventRegistry,
  capabilityRegistry,
}: {
  taskService: TaskService;
  eventRegistry: Promise<EventRegistry>;
  capabilityRegistry: Promise<CapabilityRegistry>;
}) {
  async function execute(request: Request, execution: ExecutionSelect) {
    const context = {
      ...(await taskService.load(execution.taskId)),
      execution,
    };

    const [eventDefinitions, capabilityDefinitions] = await Promise.all([
      eventRegistry,
      capabilityRegistry,
    ]);

    const grants = new Map([
      ...context.automation.triggers.flatMap(({ type }) =>
        // A trigger can name a type that left the registry, such as a former event type.
        (eventDefinitions.get(type)?.capabilities ?? []).map(
          (name) => [name, false] as const
        )
      ),
      ...context.automation.capabilities.map(
        ({ name, unscoped }) => [name, unscoped] as const
      ),
    ]);

    const tools = new Map<
      string,
      { definition: ToolDefinition; scope: ToolScope }
    >();

    for (const [name, unscoped] of grants) {
      // A granted capability can leave the registry, such as the tool of a deleted MCP server.
      const capability = capabilityDefinitions.get(name);

      for (const definition of capability?.tools ?? []) {
        const known = tools.get(definition.name)?.scope;
        tools.set(definition.name, {
          definition,
          scope:
            known === "unscoped"
              ? known
              : (grantScope(capability, unscoped) ?? known),
        });
      }
    }

    const handler = createMcpHandler(
      () => {
        const server = new McpServer({ name: "yapir", version: "1.0.0" });

        for (const { definition, scope } of tools.values()) {
          definition.register(server, context, scope);
        }

        return server;
      },
      // Hono has already routed the request: serve the path it matched.
      { route: new URL(request.url).pathname, corsOptions: false }
    );

    return await handler.fetch(request);
  }

  return { execute };
}
