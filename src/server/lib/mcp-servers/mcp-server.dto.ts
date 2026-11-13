import type { Tool } from "@modelcontextprotocol/client";
import type { McpServerSelect } from "@server/lib/db/schema";
import { z } from "zod";

// A tool of the server, as its catalog snapshot keeps it.
export type McpTool = Pick<Tool, "name" | "description" | "inputSchema">;

// Without _, the slug delimits its tools' names unambiguously.
export const mcpServerSlug = (name: string) =>
  name
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

export const McpServerName = z
  .string()
  .trim()
  .refine((name) => mcpServerSlug(name) !== "", "Add a letter or a digit")
  .describe(
    "Its display name. Its slug names its tools for agents, such as signoz for Signoz in mcp_signoz_list_alerts"
  );

// The name agents call a server's tool by: apart from built-in tools and other servers' ones.
export const mcpToolName = (serverSlug: string, toolName: string) =>
  `mcp_${serverSlug}_${toolName}`;

export const McpServerUrl = z.url().describe("Its Streamable HTTP endpoint");

export const McpServerHeaderName = z
  .string()
  .trim()
  .min(1)
  .describe("A header sent with every request, such as Authorization");

export const McpServerHeaderValue = z
  .string()
  .trim()
  .min(1)
  .describe("The header's value, such as Bearer <token>");

export const McpServerFixedIp = z
  .boolean()
  .describe(
    "Yapir calls the server from the fixed IP of the instance, which the server can allow"
  );

// The header value is write-only; agents alone need the tools' input schemas.
export const toResponseDto = (
  mcpServer: Omit<McpServerSelect, "headerValue">
) => ({
  id: mcpServer.id,
  deletedAt: mcpServer.deletedAt,
  name: mcpServer.name,
  slug: mcpServer.slug,
  url: mcpServer.url,
  headerName: mcpServer.headerName,
  fixedIp: mcpServer.fixedIp,
  tools: mcpServer.tools.map(({ name, description }) => ({
    name,
    description,
  })),
});
