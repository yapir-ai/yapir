import { pullInterval } from "@server/lib/executions/execution-lease";
import { $ } from "bun";
import { z } from "zod";

import { harnesses } from "./harness";
import type { HarnessSession } from "./harness";
import { agentInstructions } from "./instructions";
import { agentClient, failure } from "./server";
import type { Automation, Project } from "./server";
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

// The agent passes the events on to the harness as they are.
type Events = unknown[];

const pullDue = Symbol("pull due");

class ExecutionEndedError extends Error {
  override name = "ExecutionEndedError";
}

export async function runAgent() {
  const input = process.env.YAPIR_AGENT!;
  // SAFETY: the runner writes this value from its claim, just before it starts the agent.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const agentInput = JSON.parse(input) as AgentInput;
  const server = agentClient(agentInput.proxyUrl);

  try {
    await runTurns(server, agentInput);
  } catch (error) {
    if (error instanceof ExecutionEndedError) {
      return;
    }

    await server.fail(failure(error));
    throw error;
  }
}

async function runTurns(
  server: ReturnType<typeof agentClient>,
  agentInput: AgentInput
) {
  async function pullDuring<T>(
    work: Promise<T>,
    receive: (events: Events) => void,
    usage?: HarnessSession["usage"]
  ) {
    for (;;) {
      const settled = await Promise.race([work, nextPull()]);

      if (settled !== pullDue) {
        return settled;
      }

      const answer = await server.pull({ usage: await usage?.() });

      if (answer.attempt !== "running") {
        throw new ExecutionEndedError(answer.attempt);
      }

      if (answer.events.length > 0) {
        receive(answer.events);
      }
    }
  }

  const received: Events = [];

  await using session = await pullDuring(
    openSession(server, agentInput),
    (events) => {
      received.push(...events);
    }
  );

  const send = (events: Events) => {
    session.send(JSON.stringify({ events }));
  };

  let events = received;

  for (;;) {
    if (events.length === 0) {
      const answer = await server.turnEnd({ usage: await session.usage() });

      if (answer.attempt !== "running") {
        return;
      }

      ({ events } = answer);
    }

    send(events);
    await pullDuring(session.idle(), send, session.usage);
    server.saveSession(agentInput.automation.harness, session.export);
    events = [];
  }
}

async function openSession(
  server: ReturnType<typeof agentClient>,
  { proxyUrl, taskId, automation, project, networkPolicy }: AgentInput
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
    instructions: agentInstructions(
      automation.instructions,
      project,
      networkPolicy
    ),
    repositoryDirectories: project.repositories.map(repositoryDirectory),
    record: server.record,
  });
}

async function nextPull(): Promise<typeof pullDue> {
  await Bun.sleep(pullInterval);

  return pullDue;
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
