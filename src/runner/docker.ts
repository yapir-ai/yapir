import { mkdir } from "node:fs/promises";

import { $ } from "bun";
import { z } from "zod";

import { waitUntilReady } from "./process-ready";

const runtimeDirectory = "/run/agent";
const socket = `${runtimeDirectory}/docker.sock`;

export const dockerEnvironment = {
  DOCKER_HOST: `unix://${socket}`,
  // RootlessKit publishes the containers' ports on the job's localhost.
  TESTCONTAINERS_HOST_OVERRIDE: "localhost",
  // The daemon cannot start privileged containers on GitHub Actions.
  TESTCONTAINERS_RYUK_CONTAINER_PRIVILEGED: "false",
};

// The daemon runs as `agent`: its containers get no access that the agent lacks.
export async function startDocker(dataRoot: string) {
  await mkdir(runtimeDirectory, { mode: 0o700 });
  await mkdir(dataRoot, { recursive: true });
  await $`chown agent:agent ${runtimeDirectory} ${dataRoot}`;
  const { HOME, PATH } = process.env;

  // Without no-new-privs: newuidmap and newgidmap map the agent's subordinate IDs with their file capabilities.
  const daemon = Bun.spawn(
    [
      ...(await withoutSysfsMasks()),
      "setpriv",
      "--reuid=agent",
      "--regid=agent",
      "--clear-groups",
      "dockerd-rootless.sh",
      `--data-root=${dataRoot}`,
    ],
    {
      // The agent can read the daemon's environment.
      env: { HOME, PATH, XDG_RUNTIME_DIR: runtimeDirectory },
      stdout: "inherit",
    }
  );

  await waitUntilReady(
    "The Docker daemon",
    daemon,
    async () =>
      await fetch("http://docker/_ping", { unix: socket }).then(
        (ping) => ping.ok,
        // The socket is missing until the daemon listens.
        () => false
      )
  );

  return daemon;
}

// A tmpfs that masks a sysfs directory, as on GitLab.com, makes the kernel refuse sysfs to the daemon's containers.
// The daemon gets its own mount namespace, without these masks.
async function withoutSysfsMasks() {
  const { filesystems } = SysfsMounts.parse(
    await $`findmnt --list --json --output=TARGET,FSTYPE --submounts --mountpoint=/sys`.json()
  );

  const masks = filesystems.filter(({ fstype }) => fstype === "tmpfs");

  if (masks.length === 0) {
    return [];
  }

  const targets = masks.map(({ target }) => $.escape(target)).join(" ");

  return [
    "unshare",
    "--mount",
    "sh",
    "-c",
    `umount ${targets} && exec "$@"`,
    "sh",
  ];
}

const SysfsMounts = z.object({
  filesystems: z.array(z.object({ target: z.string(), fstype: z.string() })),
});
