import { z } from "zod";

import {
  McpServerFixedIp,
  McpServerHeaderName,
  McpServerHeaderValue,
  McpServerName,
  McpServerUrl,
} from "./mcp-server.dto";

export const McpServerCreateRequest = z.strictObject({
  id: z.uuidv7().optional(),
  name: McpServerName,
  url: McpServerUrl,
  headerName: McpServerHeaderName.optional(),
  headerValue: McpServerHeaderValue.optional(),
  fixedIp: McpServerFixedIp.optional(),
});

export type McpServerCreateRequestDto = z.infer<typeof McpServerCreateRequest>;
