import { credentialHeaders } from "@server/lib/executions/credential-headers";
import { ExecutionFailRequest } from "@server/lib/executions/execution-fail.dto";
import { ExecutionPullRequest } from "@server/lib/executions/execution-pull.dto";
import {
  agentPath,
  runnerCallPath,
  runnerPath,
} from "@server/lib/executions/runner-path";

import type { executionClient } from "./server";

// The agent's API key. The proxy replaces it with the execution token, in the header that the harness chose.
export const agentKey = "yapir-agent-key";

const agentRoutes = Object.values(agentPath).map(
  (route) => `${runnerPath}${route}`
);

export function serveProxy(
  serverUrl: string,
  token: string,
  {
    pull,
    turnEnd,
    fail,
  }: Pick<ReturnType<typeof executionClient>, "pull" | "turnEnd" | "fail">
) {
  return Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    // Model streams and Git transfers can stay silent longer than the default.
    idleTimeout: 0,
    routes: {
      [`${runnerPath}${runnerCallPath.pull}` as const]: {
        POST: async (request) =>
          Response.json(
            await pull(ExecutionPullRequest.parse(await request.json()))
          ),
      },
      [`${runnerPath}${runnerCallPath.turnEnd}` as const]: {
        POST: async (request) =>
          Response.json(
            await turnEnd(ExecutionPullRequest.parse(await request.json()))
          ),
      },
      [`${runnerPath}${runnerCallPath.fail}` as const]: {
        POST: async (request) => {
          await fail(ExecutionFailRequest.parse(await request.json()));

          return new Response(null, { status: 204 });
        },
      },
    },
    // The runner handles the failed requests, for example after a stop. Bun's default handler would make it exit with code 1.
    error(error) {
      console.error(error);

      return new Response(null, { status: 502 });
    },
    async fetch(request) {
      const { pathname, search } = new URL(request.url);

      if (
        !agentRoutes.some(
          (route) => pathname === route || pathname.startsWith(`${route}/`)
        )
      ) {
        return new Response(null, { status: 404 });
      }

      const headers = new Headers(request.headers);
      headers.delete("host");
      authorize(headers, token);

      return await fetch(new URL(`${pathname}${search}`, serverUrl), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
        // Bun decompresses bodies but keeps their content-encoding header.
        decompress: false,
        timeout: false,
      });
    },
  });
}

function authorize(headers: Headers, token: string) {
  const present = credentialHeaders.filter((name) => headers.has(name));

  for (const name of present) {
    headers.set(name, headers.get(name)!.replace(agentKey, token));
  }

  if (present.length === 0) {
    headers.set("authorization", `Bearer ${token}`);
  }
}
