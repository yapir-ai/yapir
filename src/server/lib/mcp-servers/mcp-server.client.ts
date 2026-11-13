import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { badRequest } from "@server/lib/errors/error.factory";
import type { FixedIp } from "@server/lib/fixed-ip/fixed-ip.dto";

import type { McpTool } from "./mcp-server.dto";

interface McpServerAccess {
  url: string;
  headerName?: string | null;
  headerValue?: string | null;
  fixedIp?: boolean;
}

export function mcpServerClient({ fixedIp }: { fixedIp?: FixedIp }) {
  function requireFixedIp(required: boolean | undefined) {
    if (required && !fixedIp) {
      throw badRequest("FIXED_IP_UNAVAILABLE");
    }
  }

  // Connects to the server, with its header on every request, for the time of use.
  async function withClient<T>(
    server: McpServerAccess,
    run: (client: Client) => Promise<T>
  ) {
    const { url, headerName, headerValue } = server;
    requireFixedIp(server.fixedIp);

    const client = new Client({ name: "yapir", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(url), {
        fetch: server.fixedIp ? fixedIp?.fetch : undefined,
        requestInit:
          headerName && headerValue
            ? { headers: { [headerName]: headerValue } }
            : undefined,
      })
    );

    try {
      return await run(client);
    } finally {
      await client.close();
    }
  }

  // The server's tools, or undefined when they cannot be listed: its previous snapshot stays.
  async function listTools(
    server: McpServerAccess
  ): Promise<McpTool[] | undefined> {
    try {
      return await withClient(server, async (client) => {
        const { tools } = await client.listTools();

        return tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        }));
      });
    } catch (error) {
      console.error("MCP server tools listing failed", {
        url: server.url,
        error,
      });

      return undefined;
    }
  }

  return { requireFixedIp, withClient, listTools };
}

export type McpServerClient = ReturnType<typeof mcpServerClient>;
