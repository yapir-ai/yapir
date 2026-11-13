import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";

import type { Connect, Plugin } from "vite";

import { DispatchPayload } from "../src/server/lib/executions/dispatch-payload.dto.ts";
import type { DispatchPayloadDto } from "../src/server/lib/executions/dispatch-payload.dto.ts";

// The payload reaches the runner alone: processes that docker exec starts inherit the container's environment.
// As the CI cache does: restores HOME saved by the task's last successful execution, and saves it after a success.
const runnerScript = String.raw`
set -e
mkdir -p "$HOME"
if [ -d /yapir-state/home ]; then cp -a /yapir-state/home/. "$HOME"; fi
YAPIR_DISPATCH="$(cat)" yapir-runner run 2>&1
rm -rf /yapir-state/next && cp -a "$HOME" /yapir-state/next
rm -rf /yapir-state/home && mv /yapir-state/next /yapir-state/home
`;

// The server's output shows the errors of Docker. The container's logs keep the runner's output.
async function docker(args: string[], input = "") {
  const child = spawn("docker", args, {
    stdio: ["pipe", "ignore", "inherit"],
  });

  child.stdin.end(input);
  await once(child, "exit");
}

// The local execution environment of `bun dev`: a Docker container for each execution, from the image of the worktree's sources.
export function localDispatcherPlugin(port: number) {
  const image = `yapir-runner:local-${port}`;
  // The tunnel exposes the dev server: only the Worker knows this random path.
  const path = `/__local-dispatcher/${randomUUID()}`;
  // One execution of a task at a time: each one restores the state saved by the previous one.
  const tasks = new Map<string, Promise<void>>();

  async function run(payload: DispatchPayloadDto, previous: Promise<void>) {
    await previous;
    await docker(
      [
        "run",
        "--rm",
        "--interactive",
        "--name",
        `yapir-${payload.executionId}`,
        "--label",
        `yapir.task=${payload.cacheKey}`,
        // The runner redirects the agent's traffic to its egress proxy.
        "--cap-add",
        "NET_ADMIN",
        "--volume",
        `yapir-state-${payload.cacheKey}:/yapir-state`,
        "--env",
        "HOME=/home/agent",
        image,
        "sh",
        "-c",
        runnerScript,
      ],
      JSON.stringify(payload)
    );
  }

  const plugin: Plugin = {
    name: "yapir:local-dispatcher",
    configureServer(server) {
      const built = docker([
        "build",
        "--quiet",
        "--tag",
        image,
        "--file",
        "src/server/Dockerfile",
        ".",
      ]);

      async function handle(
        request: IncomingMessage,
        response: ServerResponse,
        next: Connect.NextFunction
      ) {
        try {
          const body = await json(request);

          if (request.url === "/dispatch") {
            const payload = DispatchPayload.parse(body);
            tasks.set(
              payload.cacheKey,
              run(payload, tasks.get(payload.cacheKey) ?? built)
            );
          }

          if (request.url === "/release") {
            const { executionId } = DispatchPayload.pick({
              executionId: true,
            }).parse(body);

            // Exits with 0 when the container is already gone.
            await docker(["rm", "--force", `yapir-${executionId}`]);
          }

          response.end();
        } catch (error) {
          return next(error);
        }
      }

      server.middlewares.use(path, (request, response, next) => {
        void handle(request, response, next);
      });
    },
  };

  return { plugin, url: `http://127.0.0.1:${port}${path}` };
}
