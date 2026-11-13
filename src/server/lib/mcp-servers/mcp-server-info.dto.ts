import { z } from "zod";

export const McpServerInfoParams = z.object({ mcpServerId: z.uuid() });

export type McpServerInfoParamsDto = z.infer<typeof McpServerInfoParams>;
