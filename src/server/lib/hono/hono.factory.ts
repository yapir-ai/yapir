import type { ApiContainer } from "@server/lib/di/container";
import { Hono } from "hono";

export interface HonoEnv {
  Bindings: { executionContext: Pick<ExecutionContext, "waitUntil"> };
  Variables: { container: ApiContainer };
}

export const hono = () => new Hono<HonoEnv>();
