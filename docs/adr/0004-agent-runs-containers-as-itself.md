# The agent runs containers with a rootless Docker daemon of its own

In a CI execution environment that enables it, the runner starts a rootless Docker daemon as the `agent` user before the agent. The agent uses this daemon for `docker`, Docker Compose and Testcontainers. The root of the daemon's containers maps to the agent's UID, and their other users map to its subordinate IDs. A container thus has no access that the agent does not have, and the limits of [ADR 0002](0002-runner-keeps-the-execution-token.md) stay the same.

Access to a daemon that runs as root, such as the host's socket or a privileged Docker-in-Docker service, gives root on the job's host. The agent could then read the execution token, the job's OIDC token request and the job's secrets. Sysbox and Docker Sandboxes (`sbx`) isolate better, but they need software on the host or KVM, and GitLab.com's runners have neither. Rootless Podman started by the agent cannot map subordinate IDs, because no-new-privs ignores the setuid bit of `newuidmap`.

## Consequences

- The daemon runs without no-new-privs, so that `newuidmap` and `newgidmap` get their file capabilities. The agent's UID, with UID 0 unmapped, is the boundary. The daemon gets no secret in its environment, because the agent can read it.
- The job's container must allow user, mount and network namespaces. On GitHub Actions, the job removes Docker's seccomp and AppArmor profiles and its masked system paths, and adds `/dev/net/tun`. This exposes more kernel interfaces to the agent. GitLab.com's privileged containers already allow them.
- The daemon's data must be on a real file system: overlayfs over overlayfs fails. The task's cache does not keep it, so each execution pulls its images.
- A privileged container inside the daemon does not get more access than the agent. On GitHub Actions, it does not start.
