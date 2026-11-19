import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { existsSync, openSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

import { Webhooks } from "@octokit/webhooks";
import { findConnection } from "@server/lib/connections/connection.dto";
import { relations } from "@server/lib/db";
import { githubService } from "@server/lib/github/github.service";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { Webhook } from "standardwebhooks";
import { z } from "zod";

import { dropDatabase, resetDatabase } from "./database";
import { createSignInLink } from "./dev-sign-in";
import {
  createOutboundSource,
  deleteSource,
  exchanges,
  nameService,
  outboundUrl,
  replayLatest,
  serviceUrl,
} from "./porthole";
import { applySeed, readSeed } from "./seed";
import type { ApiRequest, Seed } from "./seed";
import { signInAuth } from "./sign-in-auth";

const instancesDir = "/tmp/yapir-instances";

const postgresUrl = "postgres://postgres:postgres@127.0.0.1:5432";
const playwrightCli = ["bunx", "@playwright/cli@0.1.23"];
const admin = { name: "Instance Admin", email: "admin@yapir.test" };
const checkout = path.resolve(import.meta.dirname, "..");

const ForgeSchema = z.enum(["github", "gitlab", "jira"]);

type Forge = z.infer<typeof ForgeSchema>;

const forges = {
  github: {
    variable: "GITHUB_API_URL",
    upstream: () => "https://api.github.com",
  },
  gitlab: {
    variable: "GITLAB_API_URL",
    upstream: (seed: Seed) => findConnection(seed.connections, "gitlab")!.url,
  },
  jira: {
    variable: "JIRA_API_URL",
    upstream: () => "https://api.atlassian.com",
  },
} satisfies Record<
  Forge,
  { variable: string; upstream: (seed: Seed) => string }
>;

const WebhookPayloadSchema = z.looseObject({});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

const InstanceSchema = z.object({
  id: z.string(),
  checkout: z.string(),
  commit: z.string(),
  pid: z.number(),
  env: z.record(z.string(), z.string()),
  cookie: z.object({ name: z.string(), value: z.string() }),
  apiKey: z.string(),
  capture: z.array(ForgeSchema),
});

export type Instance = z.infer<typeof InstanceSchema>;

const instanceDir = (id: string) => path.join(instancesDir, id);
const evidenceDir = (id: string) => path.join(instanceDir(id), "evidence");
const logPath = (id: string) => path.join(instanceDir(id), "vite.log");
const signInDir = (id: string) => path.join(instanceDir(id), "sign-in");
const captureSource = (id: string, forge: Forge) => `yapir-${id}-${forge}`;

export const instanceUrl = (instance: Instance) => instance.env.SERVER_URL!;
const instancePort = (instance: Instance) => Number(instance.env.PORT);

const cookieHeader = ({ cookie }: Instance) =>
  `${cookie.name}=${encodeURIComponent(cookie.value)}`;

const cliEnv = (id: string) => ({ HOME: path.join(instanceDir(id), "home") });

// Chromium's SingletonSocket fails if TMPDIR is too long for Linux AF_UNIX paths.
const browserEnv = { TMPDIR: "/tmp" };

const browserCommand = (id: string, args: string[]) => [
  ...playwrightCli,
  `-s=yapir-instance-${id}`,
  ...args,
];

const runnerImage = (instance: Instance) =>
  `yapir-runner:local-${instancePort(instance)}`;

export function readInstance(id: string) {
  return InstanceSchema.parse(
    JSON.parse(
      readFileSync(path.join(instanceDir(id), "instance.json"), "utf-8")
    )
  );
}

async function writeInstance(instance: Instance) {
  await writeFile(
    path.join(instanceDir(instance.id), "instance.json"),
    JSON.stringify(instance, null, 2),
    { mode: 0o600 }
  );
}

function liveInstanceIds() {
  return (existsSync(instancesDir) ? readdirSync(instancesDir) : []).filter(
    (id) => existsSync(path.join(instanceDir(id), "instance.json"))
  );
}

function run(
  command: string[],
  env: Record<string, string> = {},
  cwd = checkout
) {
  const [file = "", ...args] = command;

  const result = spawnSync(file, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command.join(" ")} failed:\n${result.stdout}${result.stderr}`
    );
  }

  return result.stdout.trim();
}

function passthrough(
  command: string[],
  env: Record<string, string> = {},
  cwd = checkout
) {
  const [file = "", ...args] = command;

  const result = spawnSync(file, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  process.exitCode = result.status ?? 1;
}

async function waitFor(
  check: () => Promise<boolean> | boolean,
  what: string,
  seconds = 120
) {
  for (let second = 0; second < seconds; second += 1) {
    if (await Promise.try(check).catch(() => false)) {
      return;
    }

    await sleep(1000);
  }

  throw new Error(`${what} not ready after ${seconds} s`);
}

async function freePort() {
  const server = createServer().listen(0);
  await once(server, "listening");
  const { port } = z.object({ port: z.number() }).parse(server.address());
  server.close();

  return port;
}

// The containers of the local executions reach the server on the gateway of the Docker bridge.
const dockerGateway = () =>
  run([
    "docker",
    "network",
    "inspect",
    "bridge",
    "--format",
    "{{(index .IPAM.Config 0).Gateway}}",
  ]);

async function api<T extends z.ZodType>(
  instance: Instance,
  schema: T,
  method: string,
  route: string,
  body?: ApiRequest
): Promise<z.infer<T>> {
  const response = await fetch(`${instanceUrl(instance)}/api${route}`, {
    method,
    headers: {
      "x-api-key": instance.apiKey,
      "content-type": "application/json",
    },
    body: body && JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `${method} ${route}: ${response.status} ${await response.text()}`
    );
  }

  return schema.parse(
    response.status === 204 ? undefined : await response.json()
  );
}

async function signIn(env: Record<string, string>) {
  const db = drizzle(env.DATABASE_URL!, { relations });
  const auth = await signInAuth(db, env);

  const user = await auth.saveUser(
    auth.createUser({ ...admin, role: "admin", emailVerified: true })
  );

  const [cookie] = await auth.getCookies({ userId: user.id });
  const { key } = await auth.createApiKey(user.id);
  await db.$client.end();

  return { cookie: { name: cookie!.name, value: cookie!.value }, apiKey: key };
}

function startServer(id: string, env: Record<string, string>, mode: string) {
  const log = openSync(logPath(id), "a");

  const child = spawn("bun", ["run", "dev", "--mode", mode], {
    cwd: checkout,
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", log, log],
  });

  child.unref();

  return child.pid!;
}

async function signGithubDelivery(
  seed: Seed,
  event: string,
  payload: WebhookPayload
) {
  const connection = findConnection(seed.connections, "github")!;

  const body = JSON.stringify({
    ...payload,
    installation: { id: connection.installationId },
  });

  return {
    body,
    headers: {
      "x-github-event": event,
      "x-github-delivery": crypto.randomUUID(),
      "x-hub-signature-256": await new Webhooks({
        secret: connection.webhookSecret,
      }).sign(body),
    },
  };
}

function signGitlabDelivery(seed: Seed, payload: WebhookPayload) {
  const connection = findConnection(seed.connections, "gitlab")!;
  const body = JSON.stringify(payload);
  const id = `msg_${crypto.randomUUID()}`;
  const timestamp = new Date();

  return {
    body,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "webhook-signature": new Webhook(connection.webhookSigningToken).sign(
        id,
        timestamp,
        body
      ),
    },
  };
}

async function deliver(
  instance: Instance,
  seed: Seed,
  source: string,
  event: string,
  payload: WebhookPayload
) {
  const { body, headers } =
    source === "github"
      ? await signGithubDelivery(seed, event, payload)
      : signGitlabDelivery(seed, payload);

  return await fetch(`${instanceUrl(instance)}/api/webhooks/${source}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function importGithubRepositories(instance: Instance, seed: Seed) {
  const connection = findConnection(seed.connections, "github");

  if (!connection) {
    return;
  }

  const github = await githubService(connection, {}).client();

  const repositories = await github.paginate(
    github.apps.listReposAccessibleToInstallation
  );

  const response = await deliver(instance, seed, "github", "installation", {
    action: "created",
    repositories,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub import: ${response.status} ${await response.text()}`
    );
  }
}

async function openBrowser(instance: Instance) {
  const statePath = path.join(instanceDir(instance.id), "state.json");

  const cookie = {
    ...instance.cookie,
    domain: new URL(instanceUrl(instance)).hostname,
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  };

  await writeFile(
    statePath,
    JSON.stringify({ cookies: [cookie], origins: [] })
  );

  for (const args of [
    ["open", "--browser=chromium"],
    ["state-load", statePath],
    ["goto", instanceUrl(instance)],
  ]) {
    run(
      browserCommand(instance.id, args),
      browserEnv,
      evidenceDir(instance.id)
    );
  }
}

export async function signInLink(instance: Instance) {
  return await createSignInLink(
    signInDir(instance.id),
    cookieHeader(instance),
    serviceUrl(instancePort(instance))
  );
}

export async function up({
  seed: seeded = true,
  browser = true,
  capture = [],
  mode = "development",
  oidcDiscoveryUrl = process.env.OIDC_DISCOVERY_URL,
}: {
  seed?: boolean;
  browser?: boolean;
  capture?: Forge[];
  // The Vite mode: "test" serves the Worker of the automated tests.
  mode?: string;
  oidcDiscoveryUrl?: string;
} = {}) {
  const id = randomBytes(3).toString("hex");
  const seed = seeded ? await readSeed() : undefined;
  const port = await freePort();
  const url = `http://${dockerGateway()}:${port}`;
  const databaseUrl = `${postgresUrl}/yapir_instance_${id}`;

  const env = {
    PORT: String(port),
    SERVER_URL: url,
    // The process variables take precedence over .env.
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    DATABASE_URL: databaseUrl,
    CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: databaseUrl,
    RUNNER_IMAGE: "ghcr.io/yapir-ai/runner:latest",
    ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
    BETTER_AUTH_TRUSTED_ORIGINS: serviceUrl(port),
    WEBHOOK_URL: process.env.PORTHOLE_URL!,
    __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: new URL(serviceUrl(port)).hostname,
    // Better Auth discovers the identity provider for the sign-in routes only: the instance signs in with a minted session.
    OIDC_DISCOVERY_URL: oidcDiscoveryUrl,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    ORGANIZATION_ADMIN_EMAILS: admin.email,
    DEV_SIGN_IN_DIR: signInDir(id),
    ...Object.fromEntries(
      capture.map((forge) => [
        forges[forge].variable,
        outboundUrl(captureSource(id, forge)),
      ])
    ),
  };

  for (const forge of capture) {
    await createOutboundSource(
      captureSource(id, forge),
      forges[forge].upstream(seed!)
    );
  }

  await mkdir(evidenceDir(id), { recursive: true });
  await mkdir(cliEnv(id).HOME);
  run(["docker", "compose", "--project-name", "yapir", "up", "-d", "--wait"]);
  await resetDatabase(new URL(databaseUrl));

  const instance: Instance = {
    id,
    checkout,
    commit: run(["git", "rev-parse", "--short", "HEAD"]),
    pid: startServer(id, env, mode),
    env,
    ...(await signIn(env)),
    capture,
  };

  // Written before the readiness checks, so that down also cleans up a failed launch.
  await writeInstance(instance);

  const ready = (route: string) => async () =>
    (await fetch(`${url}${route}`)).ok;

  await waitFor(ready("/api/health"), `API, see ${logPath(id)},`);
  await waitFor(ready("/src/web/main.tsx"), `Frontend, see ${logPath(id)},`);

  if (seed) {
    await applySeed(
      seed,
      async (schema, method, route, body) =>
        await api(instance, schema, method, route, body),
      async () => await importGithubRepositories(instance, seed)
    );
  }

  run(
    [
      "node",
      "cli/src/main.ts",
      "login",
      "--url",
      url,
      "--key",
      instance.apiKey,
      "--name",
      "instance",
    ],
    cliEnv(id)
  );
  await nameService(port, `yapir-${id}`);

  if (browser) {
    await openBrowser(instance);
  }

  return instance;
}

function isAlive(pid: number) {
  try {
    return process.kill(-pid, 0);
  } catch {
    return false;
  }
}

async function removeExecutionContainers(instance: Instance) {
  const client = new Client(instance.env.DATABASE_URL);
  await client.connect();

  const { rows } = await client.query<{ id: string; task_id: string }>(
    "select id, task_id from execution"
  );

  await client.end();
  spawnSync("docker", [
    "rm",
    "--force",
    ...rows.map(({ id }) => `yapir-${id}`),
  ]);
  spawnSync("docker", [
    "volume",
    "rm",
    ...new Set(rows.map(({ task_id }) => `yapir-state-${task_id}`)),
  ]);
}

export async function down(id: string) {
  const instance = readInstance(id);
  const [file = "", ...args] = browserCommand(id, ["close"]);
  spawnSync(file, args, { env: { ...process.env, ...browserEnv } });

  if (isAlive(instance.pid)) {
    process.kill(-instance.pid, "SIGTERM");
    await waitFor(() => !isAlive(instance.pid), "Shutdown");
  }

  await removeExecutionContainers(instance);
  spawnSync("docker", ["image", "rm", runnerImage(instance)]);
  await dropDatabase(new URL(instance.env.DATABASE_URL!));

  for (const forge of instance.capture) {
    await deleteSource(captureSource(id, forge));
  }

  for (const entry of ["home", "sign-in", "state.json", "instance.json"]) {
    await rm(path.join(instanceDir(id), entry), {
      recursive: true,
      force: true,
    });
  }
}

const EmailSchema = z
  .object({ user: z.object({ email: z.string() }) })
  .nullable();

async function sessionEmail(
  instance: Instance,
  headers: Record<string, string>
) {
  const response = await fetch(
    `${instanceUrl(instance)}/api/auth/get-session`,
    { headers }
  );

  return EmailSchema.parse(await response.json())?.user.email;
}

function listenerGroup(port: number) {
  const line = run(["ss", "-ltnpH", `sport = :${port}`]);
  const pid = /pid=(?<pid>\d+)/u.exec(line)?.groups?.pid;

  // The fifth field of /proc/<pid>/stat is the process group.
  return (
    pid &&
    Number(
      readFileSync(`/proc/${pid}/stat`, "utf-8").split(") ")[1]?.split(" ")[2]
    )
  );
}

async function doctor(id: string) {
  const instance = readInstance(id);
  const url = instanceUrl(instance);

  const checks: [string, () => Promise<true | string> | true | string][] = [
    ["process group alive", () => isAlive(instance.pid) || "stopped"],
    [
      "serves this checkout",
      async () =>
        (await readlink(`/proc/${instance.pid}/cwd`)) === instance.checkout ||
        "another checkout",
    ],
    [
      "port owned by the instance",
      () =>
        listenerGroup(instancePort(instance)) === instance.pid ||
        "port owned by another process",
    ],
    [
      "API healthy",
      async () => (await fetch(`${url}/api/health`)).ok || "unhealthy",
    ],
    [
      "browser session valid",
      async () =>
        (await sessionEmail(instance, { cookie: cookieHeader(instance) })) ===
          admin.email || "no session",
    ],
    [
      "CLI API key valid",
      async () =>
        (await sessionEmail(instance, { "x-api-key": instance.apiKey })) ===
          admin.email || "no session",
    ],
    [
      "local runner image built",
      () =>
        spawnSync("docker", ["image", "inspect", runnerImage(instance)])
          .status === 0 ||
        `${runnerImage(instance)} is still building: see vite.log`,
    ],
    [
      "containers reach the server",
      () =>
        spawnSync("docker", [
          "run",
          "--rm",
          "--entrypoint",
          "curl",
          runnerImage(instance),
          "-sf",
          `${url}/api/health`,
        ]).status === 0 ||
        `a container cannot reach ${url}: check the firewall of docker0`,
    ],
  ];

  let healthy = true;

  for (const [name, check] of checks) {
    const result = await Promise.try(check).catch(String);

    healthy &&= result === true;
    console.log(result === true ? `ok    ${name}` : `FAIL  ${name}: ${result}`);
  }

  console.log(
    `info  launched at ${instance.commit}, checkout now at ${run(["git", "rev-parse", "--short", "HEAD"])}: the dev server serves the live files`
  );
  process.exitCode = healthy ? 0 : 1;
}

async function webhook(
  instance: Instance,
  [source = "", event = ""]: string[],
  file?: string
) {
  const { status, body } = file
    ? await deliver(
        instance,
        await readSeed(),
        source,
        event,
        WebhookPayloadSchema.parse(JSON.parse(await readFile(file, "utf-8")))
      ).then(async (response) => ({
        status: response.status,
        body: await response.text(),
      }))
    : await replayLatest(
        source,
        event,
        `${instanceUrl(instance)}/api/webhooks/${source}`
      );

  console.log(`${status} ${body}`);
  process.exitCode = status < 300 ? 0 : 1;
}

async function scheduled(instance: Instance, [time]: string[]) {
  const query = time ? `?time=${time}` : "";

  const response = await fetch(
    `${instanceUrl(instance)}/cdn-cgi/local/scheduled${query}`
  );

  console.log(`${response.status} ${await response.text()}`);
  process.exitCode = response.ok ? 0 : 1;
}

const attribute = (span: string, name: string) =>
  `json_extract(${span}.attributes, '$."${name}"')`;

const TraceRowsSchema = z.object({
  result: z.object({
    rows: z.array(
      z.tuple([
        z.string(),
        z.number().nullable(),
        z.string(),
        z.string(),
        z.string(),
      ])
    ),
  }),
});

// The requests that the server sent, with the request of the instance that caused each one: the traces of the
// Cloudflare Local Explorer. Every instance of a checkout writes them to its .wrangler/state.
async function requests(instance: Instance, [url = ""]: string[]) {
  const origin = instanceUrl(instance);

  const sql = `SELECT ${attribute("f", "http.request.method")}, ${attribute("f", "http.response.status_code")}, ${attribute("f", "url.full")}, r.name, ${attribute("r", "url.full")}
    FROM spans f JOIN spans r ON r.trace_id = f.trace_id AND r.parent_id IS NULL
    WHERE f.name = 'fetch' AND ${attribute("f", "url.full")} LIKE '%' || ? || '%' AND ${attribute("r", "url.full")} LIKE ? || '/%'
    ORDER BY f.start_ms`;

  const response = await fetch(
    `${origin}/cdn-cgi/local/explorer/api/local/observability/query`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sql, params: [url, origin] }),
    }
  );

  for (const [
    method,
    status,
    target,
    causeMethod,
    cause,
  ] of TraceRowsSchema.parse(await response.json()).result.rows) {
    console.log(
      `${method} ${status ?? "-"} ${target}  <- ${causeMethod} ${cause.slice(origin.length)}`
    );
  }
}

async function io(instance: Instance, [forge]: string[], bodies: boolean) {
  for (const exchange of await exchanges(
    captureSource(instance.id, ForgeSchema.parse(forge))
  )) {
    console.log(
      `${exchange.method} ${exchange.path}${exchange.query} ${exchange.response?.status ?? "-"}`
    );

    if (bodies) {
      console.log(
        `  request:  ${exchange.body ?? ""}\n  response: ${exchange.response?.body ?? ""}`
      );
    }
  }
}

const TaskListSchema = z.object({
  items: z.array(z.object({ state: z.string() })),
});

const ExecutionListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      outcome: z.string().nullable(),
      error: z.string().nullable(),
      usage: z.record(z.string(), z.number().nullable()),
    })
  ),
});

const MessageListSchema = z.object({
  items: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        parts: z.array(
          z.looseObject({ type: z.string(), text: z.string().optional() })
        ),
      }),
    })
  ),
});

const executions = async (instance: Instance, taskId: string) =>
  (
    await api(
      instance,
      ExecutionListSchema,
      "GET",
      `/executions?taskId=${taskId}&limit=100`
    )
  ).items;

async function automationId(instance: Instance, target: string) {
  if (z.uuid().safeParse(target).success) {
    return target;
  }

  const agents = await api(
    instance,
    z.object({
      items: z.array(z.object({ id: z.string(), harness: z.string() })),
    }),
    "GET",
    "/agents?limit=100"
  );

  const automations = await api(
    instance,
    z.object({
      items: z.array(z.object({ id: z.string(), agentId: z.string() })),
    }),
    "GET",
    "/automations?limit=100&order=asc"
  );

  const automation = automations.items.find(({ agentId }) =>
    agents.items.some(
      (agent) => agent.id === agentId && agent.harness === target
    )
  );

  if (!automation) {
    throw new Error(`No automation of an agent with the harness ${target}`);
  }

  return automation.id;
}

async function startExecution(
  instance: Instance,
  args: string[],
  task?: string
) {
  if (task) {
    const [message = ""] = args;
    await api(instance, z.unknown(), "POST", `/tasks/${task}/messages`, {
      message,
    });

    return task;
  }

  const [target = "", message = ""] = args;

  const { taskId } = await api(
    instance,
    z.object({ taskId: z.string() }),
    "POST",
    `/automations/${await automationId(instance, target)}/executions`,
    { message }
  );

  return taskId;
}

async function waitForRest(instance: Instance, taskId: string) {
  for (let second = 0; second < 900; second += 2) {
    const { state } = (
      await api(instance, TaskListSchema, "GET", `/tasks?id=${taskId}`)
    ).items[0]!;

    if (!["queued", "running"].includes(state)) {
      return state;
    }

    await sleep(2000);
  }

  throw new Error(`The task ${taskId} did not rest in 15 min`);
}

async function lastReply(instance: Instance, executionId: string) {
  const { items } = await api(
    instance,
    MessageListSchema,
    "GET",
    `/execution-messages?executionId=${executionId}&limit=100`
  );

  return items
    .find(({ message }) => message.role === "assistant")
    ?.message.parts.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

async function execute(instance: Instance, args: string[], task?: string) {
  const taskId = await startExecution(instance, args, task);
  console.log(`task ${taskId}`);
  const state = await waitForRest(instance, taskId);
  const execution = (await executions(instance, taskId))[0]!;

  console.log(
    [
      `task ${state}`,
      `execution ${execution.id} ${execution.outcome}`,
      `error: ${execution.error ?? "-"}`,
      `usage: ${JSON.stringify(execution.usage)}`,
      `reply: ${(await lastReply(instance, execution.id)) ?? "-"}`,
    ].join("\n")
  );
  process.exitCode = state === "idle" ? 0 : 1;
}

function list() {
  for (const id of liveInstanceIds()) {
    const instance = readInstance(id);
    console.log(`${id}  ${instanceUrl(instance)}  ${instance.checkout}`);
  }
}

const usage = `Usage: bun instance <command>
  up [--no-seed] [--no-browser] [--capture github,gitlab,jira]
  sign-in <id>
  doctor <id>
  cli <id> <yapir command>
  browser <id> <playwright-cli command>
  exec <id> <automation ID | harness> <message>
  exec <id> --task <task ID> <message>
  webhook <id> <github | gitlab | jira> <porthole event name> [--file <payload.json>]
  scheduled <id> [Unix time in milliseconds]
  requests <id> <URL substring>
  io <id> <github | gitlab | jira> [--bodies]
  down <id> | --all
  list`;

const options = {
  "no-seed": { type: "boolean" },
  "no-browser": { type: "boolean" },
  capture: { type: "string" },
  task: { type: "string" },
  file: { type: "string" },
  bodies: { type: "boolean" },
  all: { type: "boolean" },
} as const;

function handOver(command: string, [id = "", ...args]: string[]) {
  if (command === "cli") {
    passthrough(["node", "cli/src/main.ts", ...args], cliEnv(id));
  }

  if (command === "browser") {
    // In the evidence directory: playwright-cli writes its snapshots there and resolves --filename from there.
    passthrough(browserCommand(id, args), browserEnv, evidenceDir(id));
  }
}

async function main(command: string, args: string[]) {
  const {
    values: flags,
    positionals: [id = "", ...commandArgs],
  } = parseArgs({ args, options, allowPositionals: true });

  switch (command) {
    case "up": {
      const instance = await up({
        seed: !flags["no-seed"],
        browser: !flags["no-browser"],
        capture: z.array(ForgeSchema).parse(flags.capture?.split(",") ?? []),
      });

      console.log(
        [
          `Instance ${instance.id} is ready at ${instanceUrl(instance)}, signed in as ${admin.email}${flags["no-seed"] ? "" : ", with the seed"}.`,
          `Open it: ${await signInLink(instance)}`,
          `Evidence: ${evidenceDir(instance.id)}`,
        ].join("\n")
      );
      break;
    }

    case "sign-in": {
      console.log(await signInLink(readInstance(id)));
      break;
    }

    case "doctor": {
      await doctor(id);
      break;
    }

    case "exec": {
      await execute(readInstance(id), commandArgs, flags.task);
      break;
    }

    case "webhook": {
      await webhook(readInstance(id), commandArgs, flags.file);
      break;
    }

    case "scheduled": {
      await scheduled(readInstance(id), commandArgs);
      break;
    }

    case "requests": {
      await requests(readInstance(id), commandArgs);
      break;
    }

    case "io": {
      await io(readInstance(id), commandArgs, Boolean(flags.bodies));
      break;
    }

    case "down": {
      const ids = flags.all
        ? liveInstanceIds().filter(
            (live) => readInstance(live).checkout === checkout
          )
        : [id];

      for (const instanceId of ids) {
        await down(instanceId);
        console.log(
          `Instance ${instanceId} is down. Evidence kept in ${evidenceDir(instanceId)}`
        );
      }

      break;
    }

    case "list": {
      list();
      break;
    }

    default: {
      console.error(usage);
      process.exitCode = 1;
    }
  }
}

if (import.meta.main) {
  const [command = "", ...args] = process.argv.slice(2);

  if (command === "cli" || command === "browser") {
    handOver(command, args);
  } else {
    await main(command, args);
  }
}
