import type { ExecutionSelect } from "@server/lib/db/schema";
import { unauthorized } from "@server/lib/errors/error.factory";
import type { HonoEnv } from "@server/lib/hono/hono.factory";
import { createMiddleware } from "hono/factory";

import { credentialHeaders } from "./credential-headers";
import { hashSecret } from "./execution-secret";

function executionToken(headers: Headers) {
  const value = credentialHeaders
    .map((name) => headers.get(name))
    .find((header) => header !== null);

  return value?.replace(/^Bearer /u, "");
}

const tokenMiddleware = (scope: "active" | "claimed") =>
  createMiddleware<
    HonoEnv & { Variables: { execution: ExecutionSelect; token: string } }
  >(async (c, nextMiddleware) => {
    const token = executionToken(c.req.raw.headers);

    const execution =
      token &&
      (await c.var.container.db.query.executionTable.findFirst({
        where: { tokenHash: hashSecret(token) },
      }));

    if (!execution || (scope === "active" && execution.outcome !== null)) {
      throw unauthorized("EXECUTION_TOKEN_INVALID");
    }

    c.set("execution", execution);
    c.set("token", token);
    await nextMiddleware();
  });

export const executionMiddleware = tokenMiddleware("active");

export const runnerMiddleware = tokenMiddleware("claimed");
