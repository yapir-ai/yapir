import { $ } from "bun";
import { Cause, Effect } from "effect";
import { z } from "zod";

import { harnesses } from "./harness";
import { agentInstructions } from "./instructions";
import { agentClient, failure } from "./server";
import type { Automation, Project } from "./server";
import { runTurns } from "./turns";
import {
  prepareRepositories,
  prepareSkills,
  prepareToolchain,
  repositoryDirectory,
  workspaceDirectory,
} from "./workspace";

// What the runner gives the agent. It holds no credential: the agent reaches Yapir through the proxy.
interface AgentInput {
  proxyUrl: string;
  taskId: string;
  automation: Automation;
  project: Project;
  networkPolicy: boolean;
  docker: boolean;
}

export async function prepareAgentDirectories() {
  const { HOME } = process.env;
  // Restored state can belong to root. Its links come from the agent, so chown does not follow them.
  await $`mkdir -p ${HOME} ${workspaceDirectory}`;
  await $`chown -R --no-dereference agent:agent ${HOME} ${workspaceDirectory}`;
  // Java reads the home directory from the user database, not from HOME.
  await $`usermod --home ${HOME} agent`;
}

const AgentVariables = z.record(z.string(), z.string());

const agentVariables = () =>
  AgentVariables.parse(Bun.YAML.parse(process.env.YAPIR_AGENT_ENV ?? "{}"));

// The CI job's processes keep its secrets and the execution token: the agent runs as `agent`, without their environment.
export function startAgent(
  input: AgentInput,
  environment: Record<string, string>
) {
  const { HOME, PATH } = process.env;

  return Bun.spawn(
    [
      "setpriv",
      "--reuid=agent",
      "--regid=agent",
      "--clear-groups",
      "--no-new-privs",
      "--bounding-set=-all",
      process.execPath,
      "agent",
    ],
    {
      cwd: "/",
      env: {
        ...agentVariables(),
        HOME,
        PATH,
        USER: "agent",
        LOGNAME: "agent",
        ...environment,
        YAPIR_AGENT: JSON.stringify(input),
      },
      stdout: "inherit",
    }
  );
}

export async function runAgent() {
  const input = process.env.YAPIR_AGENT!;
  // SAFETY: the runner writes this value from its claim, just before it starts the agent.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const agentInput = JSON.parse(input) as AgentInput;
  const server = agentClient(agentInput.proxyUrl);

  await Effect.runPromise(
    runTurns({
      server,
      harness: agentInput.automation.harness,
      open: async () => await openSession(server, agentInput),
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.promise(
          async () => await server.fail(failure(Cause.squash(cause)))
        )
      )
    )
  );
}

async function openSession(
  server: ReturnType<typeof agentClient>,
  { proxyUrl, taskId, automation, project, networkPolicy, docker }: AgentInput
) {
  await prepareRepositories(
    project,
    server.cloneUrl,
    automation.commitIdentity
  );
  await prepareToolchain(project);
  const harness = harnesses[automation.harness];
  await prepareSkills(automation.skills, harness.skillsDirectory);

  return await harness.open({
    taskId,
    model: proxiedModel(automation.model, proxyUrl),
    mcpUrl: server.mcpUrl,
    instructions: agentInstructions(automation.instructions, project, {
      networkPolicy,
      docker,
    }),
    repositoryDirectories: project.repositories.map(repositoryDirectory),
    record: server.record,
  });
}

function proxiedModel(model: Automation["model"], proxyUrl: string) {
  const proxied = (path: string) => new URL(path, proxyUrl).href;

  return {
    ...model,
    baseUrl: proxied(model.baseUrl),
    endpoints: Object.fromEntries(
      Object.entries(model.endpoints).map(([id, path]) => [id, proxied(path)])
    ),
  };
}
