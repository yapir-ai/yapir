---
description: How a GitLab project runs the executions of a Yapir project's automations in GitLab CI, with the job to add, the runner and token needs, and the accepted risks.
---

# GitLab CI execution environment

An automation with the GitLab CI execution environment runs its executions in the CI of its CI repository, a GitLab project that its Yapir project contains. A new automation of a Yapir project on GitLab uses the CI repository of the project. The CI repository defines that environment: tools, services such as a database, and the job's limits. The agent works on all the repositories of the Yapir project.

## Project setup

Add these inputs and this job to the `.gitlab-ci.yml` on the project's default branch. Yapir creates a pipeline on the default branch only, so an agent cannot change its own environment from a branch. Pipeline inputs must be declared in `.gitlab-ci.yml` itself. Included files get their values only as inputs of the `include`: see [Share the job](#share-the-job).

```yaml
spec:
  inputs:
    # Execution dispatched by Yapir. The defaults keep the project's other pipelines valid.
    dispatch:
      default: ""
    # The task's cache key, the runner image and Yapir's URL: CI/CD configuration cannot read them from the dispatch payload.
    cache_key:
      default: ""
    # A job image cannot be empty, even in a job that does not run.
    image:
      default: ghcr.io/yapir-ai/runner
    server_url:
      default: ""
---
variables:
  # Set only in Yapir's pipelines. Rules in any file, included ones too, can test it, unlike inputs.
  YAPIR_TASK: $[[ inputs.cache_key ]]
yapir:
  rules:
    - if: $YAPIR_TASK
  image: $[[ inputs.image ]]
  timeout: 1h
  # One execution of a task at a time: each one restores the state saved by the previous one.
  resource_group: yapir-$[[ inputs.cache_key ]]
  # The runner proves its claim with this ID token.
  id_tokens:
    YAPIR_ID_TOKEN:
      aud: $[[ inputs.server_url ]]
  variables:
    # A clean build directory without a clone: the runner checks out the repository itself.
    GIT_STRATEGY: empty
    # The payload goes through the environment: templating it into the command is an injection vector.
    YAPIR_DISPATCH:
      value: $[[ inputs.dispatch ]]
      expand: false
  cache:
    key: yapir-$[[ inputs.cache_key ]]
    paths:
      - home
    # A failed execution keeps its session: the next one resumes it.
    when: always
  script:
    # GitLab caches only paths in the build directory. A job variable would also apply to GitLab Runner's
    # own Git setup, which fails before that directory exists.
    - export HOME="$CI_PROJECT_DIR/home"
    - yapir-runner run
```

Add the project's own `before_script` commands and its `services` to the job. If the project defines its own `stages`, give the job one of them. The job runs in the runner image that Yapir gives in the `image` input. This image contains the runner and the harness at the versions that the Yapir instance supports.

The agent runs without root privileges and does not inherit the job's environment variables. Follow [Agent access](agent-access.md) when you add tools, services or credentials to the job.

The runner installs the tools that each repository of the Yapir project declares in its mise configuration (`mise.toml`, `.tool-versions`). They are installed under `HOME`, which the cache restores for the next executions of the task.

Yapir's pipelines set `YAPIR_TASK`, so the project's other jobs, in `.gitlab-ci.yml` or in included files, exclude them with this rule. Add it first to each job's `rules`:

```yaml
test:
  rules:
    - if: $YAPIR_TASK
      when: never
    - if: $CI_PIPELINE_SOURCE != "merge_request_event"
  script: bun test
```

A job without `rules` then needs a final rule to keep running: `if: $CI_PIPELINE_SOURCE != "merge_request_event"` keeps it out of merge request pipelines, like a job without `rules`. `workflow:rules`, if any, must allow pipelines created through the API on the default branch.

The harness keeps its state in `HOME`. The cache saves it at the end of each job, also when the job fails: the next execution resumes the session, with the unacknowledged events of a failed execution. A task without a cache continues with a fresh session.

## Share the job

To give the job to several projects, put the `variables` and the `yapir` job in a [CI/CD component](https://docs.gitlab.com/ci/components/). The component declares the same four inputs, without defaults. Each project keeps the `spec` of its `.gitlab-ci.yml` and passes its pipeline inputs to the component in its `include`:

```yaml
include:
  - component: $CI_SERVER_FQDN/my-group/ci-components/yapir@1.0.0
    inputs:
      dispatch: $[[ inputs.dispatch ]]
      cache_key: $[[ inputs.cache_key ]]
      image: $[[ inputs.image ]]
      server_url: $[[ inputs.server_url ]]
```

Add the `if: $YAPIR_TASK` and `when: never` rule first to the jobs of the shared components too. A project cannot add a rule to an included job without replacing all of its `rules`.

## Run containers

To let the agent use `docker`, Docker Compose or Testcontainers, change the runner's command:

```yaml
script:
  - export HOME="$CI_PROJECT_DIR/home"
  - yapir-runner run --docker-data-root "$CI_BUILDS_DIR/docker"
```

The runner then starts a Docker daemon that runs as the agent. See [Agent access](agent-access.md#run-containers) for what the agent can do with it.

The daemon creates user, mount and network namespaces. GitLab.com instance runners run privileged containers, which allow them. A project runner needs `privileged = true` in its `[runners.docker]` configuration.

## Inject credentials

To give the agent [injected credentials](agent-access.md#inject-credentials), set `YAPIR_CREDENTIALS` in the job's `variables`. GitLab expands the CI/CD variables in the values, such as `$CI_JOB_TOKEN`:

```yaml
yapir:
  variables:
    YAPIR_CREDENTIALS: |
      - url: https://gitlab.com/api/v4/groups/123/-/packages/maven/
        header: Job-Token
        value: $CI_JOB_TOKEN
```

`CI_JOB_TOKEN` reads the packages of a project that adds the CI repository to its job token allowlist. In this allowlist, give the CI repository the fine-grained permission `READ_PACKAGES` only: the token then cannot publish or delete packages.

## Pass variables to the agent

To give the agent [variables](agent-access.md#pass-variables-to-the-agent), set `YAPIR_AGENT_ENV` in the job's `variables`. GitLab expands the CI/CD variables in the values:

```yaml
yapir:
  variables:
    YAPIR_AGENT_ENV: |
      npm_config_//gitlab.com/api/v4/groups/123/-/packages/npm/:_authToken: $CI_JOB_TOKEN
```

## Token

Creating a pipeline on a protected branch requires the right to merge or push to it. GitLab protects the default branch with **Allowed to merge: Maintainers** by default: give the bot the **Maintainer** role, or allow its role to merge into the default branch.

## Runners

The job needs a runner with the Docker executor, which runs the job's `image`. The runner redirects the agent's traffic with the `NET_ADMIN` capability: GitLab.com instance runners run privileged containers, which have it. A project runner needs `privileged = true` or `cap_add = ["NET_ADMIN"]` in its `[runners.docker]` configuration. GitLab.com instance runners can require the account's identity verification before they run jobs. A project runner works too.

GitLab.com instance runners share a distributed cache, and remove cache contents not updated in the last 14 days. A project runner keeps its cache on its own host unless it is configured with a distributed cache: with several runners, a task's execution can land on a runner without the task's cache.

## Accepted risks

- The job runs on the protected default branch, so it receives protected CI/CD variables and a `CI_JOB_TOKEN` with the bot's role. The runner excludes them from the agent's environment, but readable files can still expose secrets. Give sensitive variables, including file variables, an environment scope that the `yapir` job does not use.
- GitLab scopes caches by key and by protected or unprotected ref, not by pipeline. Jobs of the project's other pipelines on protected branches and tags can restore or overwrite a task's cache, and so read or alter the agent's sessions. Without **Use separate caches for protected branches**, jobs on every branch can.
- Yapir does not stop a GitLab CI job: the runner exits when its execution ends or loses its lease, and `timeout` bounds a stuck job.
