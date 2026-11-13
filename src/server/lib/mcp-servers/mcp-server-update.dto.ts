import { z } from "zod";

import {
  McpServerFixedIp,
  McpServerHeaderName,
  McpServerHeaderValue,
  McpServerName,
  McpServerUrl,
} from "./mcp-server.dto";

export const McpServerUpdateRequest = z
  .strictObject({
    name: McpServerName,
    url: McpServerUrl,
    headerName: McpServerHeaderName.nullable(),
    headerValue: McpServerHeaderValue,
    fixedIp: McpServerFixedIp,
  })
  .partial();

export type McpServerUpdateRequestDto = z.infer<typeof McpServerUpdateRequest>;
