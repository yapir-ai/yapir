import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { McpServerSelect } from "@server/lib/db/schema";
import type { CapabilityDefinition } from "@server/lib/tools/capability-definition";
import { z } from "zod";

import type { McpServerClient } from "./mcp-server.client";
import { mcpToolName } from "./mcp-server.dto";
import type { McpTool } from "./mcp-server.dto";

const ToolArguments = z.record(z.string(), z.json());

// Advertises the remote tool's input schema as is: the remote server validates the arguments.
function remoteInputSchema(
  jsonSchema: McpTool["inputSchema"]
): StandardSchemaWithJSON<z.infer<typeof ToolArguments>> {
  return {
    "~standard": {
      ...ToolArguments["~standard"],
      jsonSchema: { input: () => jsonSchema, output: () => jsonSchema },
    },
  };
}

// Each tool of the server's snapshot, proxied unscoped: granting it is the only guard.
export function mcpServerCapabilities(
  server: McpServerSelect,
  mcpServerClient: McpServerClient
): CapabilityDefinition[] {
  return server.tools.map((tool) => {
    const name = mcpToolName(server.slug, tool.name);

    return {
      name: `mcp.${server.id}.${tool.name}`,
      provider: { id: server.id, label: server.name },
      resource: { id: "tools", label: "Tools" },
      label: tool.name,
      description: tool.description ?? tool.name,
      tools: [
        {
          name,
          register(mcp) {
            mcp.registerTool(
              name,
              {
                description: tool.description,
                inputSchema: remoteInputSchema(tool.inputSchema),
              },
              async (input) =>
                await mcpServerClient.withClient(
                  server,
                  async (client) =>
                    await client.callTool({ name: tool.name, arguments: input })
                )
            );
          },
        },
      ],
    };
  });
}
