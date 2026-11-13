---
description: How a GitHub repository runs the executions of a project's automations in GitHub Actions, with the workflow to commit and the accepted risks.
---

# GitHub Actions execution environment

An automation with the GitHub Actions execution environment runs its executions in the CI of its CI repository, a repository of its project. A new automation of a project on GitHub uses the CI repository of the project. The CI repository defines that environment: tools, services such as a database, and the job's limits. The agent works on all the repositories of the project.

## Repository setup

Commit `.github/workflows/yapir.yml` on the repository's default branch. Yapir dispatches this workflow on the default branch only, so an agent cannot change its own environment from a branch.

```yaml
name: Yapir

on:
  workflow_dispatch:
    inputs:
      dispatch:
        description: Execution dispatched by Yapir
        required: true

# One execution of a task at a time: each one restores the state saved by the previous one.
concurrency:
  group: yapir-${{ fromJSON(inputs.dispatch).cacheKey }}

# The runner proves its claim with the job's OIDC token.
permissions:
  id-token: write

jobs:
  execution:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    container:
      image: ${{ fromJSON(inputs.dispatch).image }}
      # The runner redirects the agent's traffic to its egress proxy.
      options: --cap-add NET_ADMIN
    steps:
      - uses: actions/cache/restore@v6
        id: state
        with:
          path: /github/home
          key: yapir-${{ fromJSON(inputs.dispatch).cacheKey }}-${{ github.run_id }}
          restore-keys: yapir-${{ fromJSON(inputs.dispatch).cacheKey }}-
      # The payload goes through the environment: templating it into the command is an injection vector.
      - run: yapir-runner run
        env:
          YAPIR_DISPATCH: ${{ inputs.dispatch }}
      # A failed execution keeps its session: the next one resumes it.
      - if: always()
        uses: actions/cache/save@v6
        with:
          path: /github/home
          key: ${{ steps.state.outputs.cache-primary-key }}
```

Add the project's own steps before the cache restore, and its `services`, to the job. The job runs in the runner image that Yapir gives in the dispatch payload. This image contains the runner and the harness at the versions that the Yapir instance supports.

The agent runs without root privileges and does not inherit the job's environment variables. Follow [Agent access](agent-access.md) when you add tools, services or credentials to the job.

The runner installs the tools that each repository of the project declares in its mise configuration (`mise.toml`, `.tool-versions`). They are installed under `HOME`, which the cache restores for the next executions of the task.

The harness keeps its state in `HOME` (`/github/home` in a container job). The cache saves it at the end of each job, also when the runner fails: the next execution resumes the session, with the unacknowledged events of a failed execution. GitHub evicts caches unused for seven days and limits each repository's caches in size: a task without a cache continues with a fresh session.

## Run containers

To let the agent use `docker`, Docker Compose or Testcontainers, change the `container` and the runner's step:

```yaml
container:
  image: ${{ fromJSON(inputs.dispatch).image }}
  # The agent's rootless Docker daemon creates user, mount and network namespaces.
  options: >-
    --cap-add NET_ADMIN --security-opt seccomp=unconfined --security-opt apparmor=unconfined --security-opt systempaths=unconfined --device /dev/net/tun
steps:
  # ...
  - run: yapir-runner run --docker-data-root "$RUNNER_TEMP/docker"
    env:
      YAPIR_DISPATCH: ${{ inputs.dispatch }}
```

The runner then starts a Docker daemon that runs as the agent. See [Agent access](agent-access.md#run-containers) for what the agent can do with it.

## Inject credentials

To give the agent [injected credentials](agent-access.md#inject-credentials), set `YAPIR_CREDENTIALS` in the runner's step. Take the secrets from the expressions of the workflow, such as `secrets` or `github.token`. For the GitHub Packages of the repository's owner, give the job token `packages: read`:

```yaml
permissions:
  id-token: write
  packages: read
# ...
  - run: yapir-runner run
    env:
      YAPIR_DISPATCH: ${{ inputs.dispatch }}
      YAPIR_CREDENTIALS: |
        - url: https://maven.pkg.github.com/my-org/
          header: Authorization
          value: Bearer ${{ github.token }}
```

## Pass variables to the agent

To give the agent [variables](agent-access.md#pass-variables-to-the-agent), set `YAPIR_AGENT_ENV` in the runner's step. Take the values from the expressions of the workflow, such as `secrets` or `github.token`. For GitHub Packages, give the job token `packages: read`, as for [injected credentials](#inject-credentials):

```yaml
- run: yapir-runner run
  env:
    YAPIR_DISPATCH: ${{ inputs.dispatch }}
    YAPIR_AGENT_ENV: |
      npm_config_//npm.pkg.github.com/:_authToken: ${{ github.token }}
```

## Accepted risks

- GitHub scopes caches by branch, not by key. Other workflows of the repository, including some pull request workflows, can restore a task's cache, and so read the agent's sessions.
- Yapir does not stop a GitHub Actions job: the runner exits when its execution ends or loses its lease, and `timeout-minutes` bounds a stuck job.
