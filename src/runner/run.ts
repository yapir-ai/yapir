import { DispatchPayload } from "@server/lib/executions/dispatch-payload.dto";

import { prepareAgentDirectories, startAgent } from "./agent";
import { dockerEnvironment, startDocker } from "./docker";
import {
  egressEnvironment,
  injectedCredentials,
  startEgressProxy,
} from "./egress";
import { identityToken } from "./identity";
import { serveProxy } from "./proxy";
import { claim, executionClient, failure } from "./server";

interface RunOptions {
  dockerDataRoot?: string;
}

export async function run(options: RunOptions) {
  const end = await runExecution(options);

  process.exitCode = end === "succeeded" || end === "stopped" ? 0 : 1;
}

async function runExecution({ dockerDataRoot }: RunOptions) {
  // The payload comes from the environment: CI templating inside a command is an injection vector.
  const dispatch = DispatchPayload.parse(
    JSON.parse(process.env.YAPIR_DISPATCH!)
  );

  await prepareAgentDirectories();

  const claimed = await claim(
    dispatch,
    await identityToken(dispatch.serverUrl)
  );

  if (!claimed.claimed) {
    return claimed.outcome ?? "lost";
  }

  const { token, taskId, automation, project, allowedHosts } = claimed;
  const networkPolicy = allowedHosts !== null;

  const server = executionClient(dispatch.serverUrl, token);

  try {
    await using stack = new AsyncDisposableStack();
    const proxy = serveProxy(dispatch.serverUrl, token, server);
    stack.defer(async () => {
      await proxy.stop(true);
    });
    let agentEnvironment = {};
    const credentials = injectedCredentials();

    // The agent's Docker daemon pulls its images through the egress proxy too.
    if (credentials.length > 0 || networkPolicy) {
      const egress = await startEgressProxy({ credentials, allowedHosts });
      stack.defer(async () => {
        egress.kill();
        await egress.exited;
      });
      agentEnvironment = { ...agentEnvironment, ...egressEnvironment };
    }

    if (dockerDataRoot !== undefined) {
      const docker = await startDocker(dockerDataRoot);
      stack.defer(async () => {
        docker.kill();
        await docker.exited;
      });
      agentEnvironment = { ...agentEnvironment, ...dockerEnvironment };
    }

    const agent = startAgent(
      { proxyUrl: proxy.url.href, taskId, automation, project, networkPolicy },
      agentEnvironment
    );

    stack.defer(() => {
      agent.kill();
    });
    const exitCode = await agent.exited;

    if (exitCode !== 0 && server.outcome === undefined) {
      throw new Error(`The agent exited with code ${exitCode}`);
    }
  } catch (error) {
    await server.fail(failure(error));
  }

  return server.outcome ?? "lost";
}
