import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import type { CallToolRequest } from "@modelcontextprotocol/client";
import { z } from "zod";

// A Yapir tool returns its JSON result as one text.
const ToolResult = z.object({
  content: z.tuple([z.object({ type: z.literal("text"), text: z.string() })]),
});

// The MCP server of the executions, as an agent sees it with its execution token.
export function mcp(baseURL: string) {
  async function withClient<T>(
    token: string,
    run: (client: Client) => Promise<T>
  ) {
    const client = new Client({ name: "test-agent", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL("/api/runner/mcp", baseURL), {
        requestInit: { headers: { authorization: `Bearer ${token}` } },
      })
    );

    try {
      return await run(client);
    } finally {
      await client.close();
    }
  }

  // The names of the tools of the execution.
  async function tools(token: string) {
    return await withClient(token, async (client) =>
      (await client.listTools()).tools.map(({ name }) => name)
    );
  }

  // The JSON result of a tool call.
  async function call(
    token: string,
    name: string,
    input?: CallToolRequest["params"]["arguments"]
  ) {
    return await withClient(token, async (client) => {
      const {
        content: [{ text }],
      } = ToolResult.parse(await client.callTool({ name, arguments: input }));

      return z.json().parse(JSON.parse(text));
    });
  }

  return { tools, call };
}
