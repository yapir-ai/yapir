import { z } from "zod";

import { ConnectionTypeSchema } from "./connection.dto";

// A type has at most one Connection: the type identifies it.
export const ConnectionInfoParams = z.object({ type: ConnectionTypeSchema });

export type ConnectionInfoParamsDto = z.infer<typeof ConnectionInfoParams>;
