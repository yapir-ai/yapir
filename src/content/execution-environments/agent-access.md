---
description: The agent's access to CI variables, files, tools and services in the runner image.
---

# Agent access

`yapir-runner run` stays root. It claims the execution, keeps the execution token that Yapir issues and serves a proxy on `127.0.0.1`. It runs the agent's work as `agent` (UID 65532): the clone of each repository of the project, the toolchain setup and the harness. This user has no supplementary groups and cannot gain privileges. The CI job's other commands still run as root.

The agent gets only the variables that it needs, such as `HOME` and `PATH`. It does not get the CI job's variables, secrets or job tokens, except the [variables that the job passes to it](#pass-variables-to-the-agent), and it cannot read the environment of root processes. It does not get the execution token either: its Git, model, MCP and transcript requests go through the runner's proxy, which adds the token. The CI job can give it [injected credentials](#inject-credentials) the same way.

## Set up tools and services

- Install system packages in the job's setup commands. The agent cannot install them as root.
- Declare the agent's tools and non-secret environment values in the mise configuration of each repository. The runner runs `mise install` in each repository and puts the mise shims in `PATH`: a command gets the tools and values of the repository in which it runs. Pass the CI job's values, such as a service URL, as [variables](#pass-variables-to-the-agent).
- Use `HOME` only for the agent's state. The runner gives this directory and `/workspace` to `agent`, with the files that the cache restores. The runner clones each repository in `/workspace`, at its path on the Git host. Do not put CI credentials there.
- Keep the image's root user for the CI job. Do not give UID 65532 to the host CI runner or to other processes that hold secrets.

## Inject credentials

To let the agent use a private registry or API, declare its credentials in the `YAPIR_CREDENTIALS` variable of the runner's job, in YAML. The runner then redirects the agent's traffic to an egress proxy, which adds each header to the agent's requests to its URL. The agent does not get the secrets, and the repositories keep their usual configuration.

```yaml
- url: https://gitlab.com/api/v4/groups/123/-/packages/maven/
  header: Job-Token
  value: $CI_JOB_TOKEN
```

- `url` is an HTTPS URL. The proxy adds the header to the requests to the same host and port, with a path that starts with the path of `url`.
- Let the CI put the secret in `value`: see the [GitHub Actions](github-actions.md#inject-credentials) and [GitLab CI](gitlab-ci.md#inject-credentials) guides.
- The proxy adds the header for all methods. Give each token the smallest scope, such as read-only access to a registry.
- The job's container needs the `NET_ADMIN` capability. Without it, the runner fails the execution.
- The proxy decrypts the requests to these hosts only, with a CA that the agent's commands trust: the system's store, Node.js, Python and Java. The agent's containers do not trust it: the credentials do not apply in them.
- The agent reaches the networks of the job's container, where its services are, directly. Its other traffic goes through the proxy unchanged. The agent cannot use IPv6.

## Network policy

An Organization Admin can enable the network policy in Yapir, on the **Network policy** page. The runner then gives the agent access only to:

- the allowed hosts: Yapir's hosts of common tools and package registries, unless the admin disables them, and the organization's hosts;
- the host of each [injected credential](#inject-credentials), with all its paths, not only the path of `url`. For example, a credential for a package registry on `gitlab.com` gives access to all of `gitlab.com`;
- the networks of the job's container, where its services are;
- DNS.

The egress proxy connects to the host that each request names, not to the address that the agent chose. It refuses an HTTP or HTTPS request to another host with a 403 response and the `X-Yapir-Network-Policy: denied` header. It refuses other TCP traffic and closes the connection. The runner's log has a `network policy denied <host>` line for each refusal. In a container, a refused HTTPS request fails with a TLS error, because the container does not trust the proxy's CA.

The job's container needs the `NET_ADMIN` capability. Without it, the runner fails the executions.

## Pass variables to the agent

To give the agent variables of the CI job, declare them in the `YAPIR_AGENT_ENV` variable of the runner's job: a YAML map of names to values. Let the CI put the values: see the [GitHub Actions](github-actions.md#pass-variables-to-the-agent) and [GitLab CI](gitlab-ci.md#pass-variables-to-the-agent) guides.

```yaml
SERVICE_URL: http://api:8080
npm_config_//gitlab.com/api/v4/groups/123/-/packages/npm/:_authToken: $CI_JOB_TOKEN
```

- Each value is a string: quote a number or a boolean, such as `"1"`. A value that the CI leaves empty, such as a CI variable that does not exist, fails the execution. To make a value optional, quote it: `SENTRY_DSN: "$SENTRY_DSN"`.
- The runner's variables, such as `HOME`, `PATH` and `DOCKER_HOST`, have priority over the job's.
- The agent can read these values: for a secret, use [injected credentials](#inject-credentials) when the tool allows it. A secret in a variable has the risks that [Limits](#limits) gives.

To give a secret in a variable:

- Configure the tool from the environment, so that the repositories keep their usual configuration. npm reads its configuration from `npm_config_<key>` variables, as in the example. Maven 3.9 and later read `MAVEN_ARGS`: in the job's setup commands, write a settings file outside `HOME` and `/workspace`, with `${env.MAVEN_TOKEN}` in its `<server>`, and pass `MAVEN_ARGS: -gs <file>`.
- Do not run commands that write the secret to `HOME`, such as `npm login`: the cache saves `HOME`.
- Use a token that expires with the job, such as `CI_JOB_TOKEN` or `GITHUB_TOKEN`, or a read-only token, such as a deploy token with `read_package_registry` only. Do not give a token that can publish packages or push code.

## Run containers

When the CI job enables it, the runner starts a rootless Docker daemon as `agent`, before the agent: see the [GitHub Actions](github-actions.md#run-containers) and [GitLab CI](gitlab-ci.md#run-containers) guides. The agent gets `DOCKER_HOST` and the Testcontainers settings for this daemon. `docker`, Docker Compose and Testcontainers then work without more configuration.

- Root in a container is the agent's UID outside it. A container, even with `--privileged`, a mount of `/` or the host's PID namespace, has no access that the agent does not have.
- The daemon cannot start privileged containers on GitHub Actions.
- Containers publish their ports on `localhost`. Compose's relative bind mounts work.
- Each execution pulls its images again.
- Testcontainers for Java needs version 1.21 or later: the daemon refuses older API versions.

## Limits

This separates process identities. It does not isolate the filesystem. Without a [network policy](#network-policy), it does not isolate the network.

- The agent can read files that their permissions allow, including CI file variables and credentials that setup commands write. Keep secrets outside the agent's home, owned by another user, with permissions that deny UID 65532 access.
- The agent can reach the job's services and the metadata endpoints that the job can reach. Do not expose privileged services or the host's Docker socket to it.
- Under a network policy, the agent can still send data through DNS, the allowed hosts and the hosts of the injected credentials. On a host that runs several jobs, the job's networks can contain the containers of other jobs.
- The agent can use the runner's proxy, and so the execution's Git, model, MCP and transcript access, until the execution ends. It can also use the injected credentials through the egress proxy.
- The agent can disclose the variables that the job passes to it, and so their secrets:
  - in the execution's transcript, which Yapir keeps, and in the requests to the model provider;
  - in the harness's sessions in `HOME`, which the cache saves;
  - in a commit, a merge request or a comment;
  - to the hosts that it reaches, also after a prompt injection, for example in an issue.
- The CI masks a variable in the job's log only, not in the transcript, the cache or the agent's changes.
- The agent controls its home and the workspace, also in the next executions of the task. Do not run privileged commands that read scripts or configuration from them. On GitHub Actions, put the project's own steps before the cache restore.
- The CI operator and root processes can still read the job's secrets and the agent's state. A host shared with untrusted processes is outside this boundary.
- A privileged job container, or the container options that the Docker daemon needs, expose more kernel interfaces to the agent. A kernel vulnerability can then give it root.
