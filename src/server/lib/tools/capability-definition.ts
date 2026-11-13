import type { McpServer } from "@modelcontextprotocol/server";
import type { ExecutionSelect } from "@server/lib/db/schema";
import type { CatalogMetadata } from "@server/lib/events/event-definition";
import type { TaskContext } from "@server/lib/tasks/task.service";
import { z } from "zod";

export type ToolContext = TaskContext & { execution: ExecutionSelect };

export type ToolCallContext = ToolContext & { unscoped: boolean };

export type ToolScope = "scoped" | "unscoped" | undefined;

export interface ToolDefinition {
  name: string;
  register: (server: McpServer, context: ToolContext, scope: ToolScope) => void;
}

export interface CapabilityDefinition extends CatalogMetadata {
  name: string;
  description: string;
  scopable?: boolean;
  tools: ToolDefinition[];
}

export type CapabilityRegistry = ReadonlyMap<string, CapabilityDefinition>;

const scopeDescriptions = {
  scoped:
    "Its scope: reads reach the issues and change requests associated with this automation's tasks, writes those associated with this task; a list keeps only the associated ones, so a GitHub or Jira page can hold fewer items than requested.",
  unscoped:
    "Its scope: every issue and change request of the project's repositories, or every issue of the Jira site.",
};

export const repositoryInput = z
  .string()
  .min(1)
  .describe(
    "The repository's path on the Git host, from the repositories of your instructions, such as owner/name"
  );

export function tool<Input extends z.ZodObject>({
  name,
  description,
  inputSchema,
  execute,
}: {
  name: string;
  description: string;
  inputSchema: Input;
  execute: (
    input: z.infer<Input>,
    context: ToolCallContext
  ) => Promise<object | string>;
}): ToolDefinition {
  return {
    name,
    register(server, context, scope) {
      // The server sees any object schema: execute gets the input parsed by this tool's.
      const schema: z.ZodObject = inputSchema;
      server.registerTool(
        name,
        {
          description: scope
            ? `${description} ${scopeDescriptions[scope]}`
            : description,
          inputSchema: schema,
        },
        async (input) => ({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                await execute(inputSchema.parse(input), {
                  ...context,
                  unscoped: scope === "unscoped",
                })
              ),
            },
          ],
        })
      );
    },
  };
}
