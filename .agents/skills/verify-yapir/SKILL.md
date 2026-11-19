---
name: verify-yapir
description: Drive a disposable local Yapir instance through its web UI, CLI and API, and capture proof. Use to verify, smoke-test or demonstrate a user-facing behavior of Yapir in the real app, including agent executions, Git host events and schedules, or when the user asks to launch the app.
---

Each verification starts its own Yapir instance with `bun instance`, in `scripts/instance.ts`: a Vite dev server on a free port and its own PostgreSQL database, with an Organization Admin already signed in to a headless browser and to the CLI. Executions run on the local dispatcher: one Docker container for each execution. Drive only the instances that you started.

All commands run from the root of the checkout under test. `bun instance` without a command prints the usage.

## Launch the app for the user

When the user asks to launch the app, run `bun instance up --no-browser`. Give the user the sign-in link that `up` prints: it opens the instance through porthole. The link signs in once: for a new link, run `bun instance sign-in <id>`. Stop the instance with `bun instance down <id>` when the user is done with it.

## 1. Launch

One-time setup on a machine: `bun install`, and `bunx @playwright/cli@0.1.23 install-browser chromium`. Docker must run. `.env` must exist: the instance uses its OIDC application.

```sh
bun instance up [--no-seed] [--no-browser] [--capture github,gitlab,jira]
```

`up` starts the shared PostgreSQL container if necessary, creates and migrates the database `yapir_instance_<id>`, signs in `admin@yapir.test` with its API key, starts `bun run dev`, waits for the API and the frontend, applies the seed, logs in the CLI, names the service in porthole and opens the browser on the instance. It takes about 30 s. The instance is ready when `up` prints `Instance <id> is ready at <url>`, then the sign-in link. Keep the ID: every other command takes it. `bun instance list` shows the running instances of the machine with their checkout, the instances of other agents included.

The URL is on the gateway of the Docker bridge, such as `http://172.17.0.1:<port>`, so that the execution containers reach the server. Browsers outside the host open the instance through porthole, with the sign-in link.

### Seed

`up` applies `~/.config/yapir/seed.json` through the API of the instance. It holds real credentials: keep it outside the checkouts, with mode `0600`, and never print its values. `--no-seed` starts an empty organization. `SeedSchema` in `scripts/seed.ts` gives the format: the request bodies of the API, where a model provider, an agent, a project and a repository are referenced by name or path.

The seed creates, in this order: the model providers, the defaults, the Connections, the agents, the projects with their repositories, then the automations. After the Connections, `up` imports the GitHub repositories with a signed `installation.created` delivery. The GitLab Connection imports its projects itself, and installs its webhook on porthole. [features/README.md](features/README.md) gives the resulting baseline.

Instances are isolated by port, database, browser session and CLI home. Instances of the same checkout share the local R2 state and the request traces in `.wrangler/state`, and the Vite cache.

## 2. Doctor

Run it first when anything looks wrong. It is read-only:

```sh
bun instance doctor <id>
```

Each line is `ok` or `FAIL`. It checks that the process group lives, serves this checkout and owns the port, that the API, the browser session and the CLI API key work, that the runner image is built and that a container reaches the server. Exit code `1` means: do not drive this instance. Read `/tmp/yapir-instances/<id>/vite.log`, then run `down` and `up` again.

The dev server builds the runner image `yapir-runner:local-<port>` from `src/server/Dockerfile` when it starts. The first build on a machine takes some minutes, and `local runner image built` fails until it ends: wait, and run `doctor` again. Later builds come from the Docker cache.

The dev server serves the live files of the checkout: an edit is in the instance after HMR, without a restart. A change to `wrangler.jsonc`, `vite.config.ts`, a migration or the runner (`src/server/Dockerfile`, `src/runner/`) needs a new instance.

## 3. Drive

Find the recipe of the feature in [features/README.md](features/README.md) before you drive it.

- **Browser**: `bun instance browser <id> <playwright-cli command>`. It is [`playwright-cli`](https://github.com/microsoft/playwright-cli), with the session of the instance. `bun instance browser <id> --help` lists the commands. Target elements by ARIA role and accessible name, such as `click 'role=button[name="Create project"]'` and `fill 'role=textbox[name="Name"]' "Demo"`. Use the `ref` of a `snapshot` only for an element without a name. The browser is signed in, so `goto <url>/<path>` opens any page.
- **CLI**: `bun instance cli <id> <command>`. It is `node cli/src/main.ts`, logged in to the instance. `bun instance cli <id> --help` lists the resources, `bun instance cli <id> <resource> <operation> --help` gives the options and the body schema. Write bodies with `--data '<json>'`. The status line goes to stderr, the JSON body to stdout, and an error status exits with `1`.
- **API**: `curl -H "x-api-key: <apiKey>" <url>/api/...`, with the `apiKey` of `/tmp/yapir-instances/<id>/instance.json`. `<url>/api/docs` documents every route.
- **Executions**: `bun instance exec <id> <automation ID | harness> "<message>"` starts the automation, waits until its Task rests and prints the Task ID, the Task state, the outcome of its latest execution, the error, the usage and the last reply of the agent. A harness, such as `opencode`, selects the oldest automation of an agent with this harness. `bun instance exec <id> --task <task ID> "<message>"` continues the Task. The exit code is `0` only when the Task rests `idle`.
- **Git host events**: `bun instance webhook <id> <github | gitlab | jira> <event>` replays to the instance the latest delivery of this event that porthole received from the Git host, signed again. The event is the porthole event name, such as `issues.opened` or `issue.open`: `curl -s 'http://127.0.0.1:5200/api/exchanges?source=github&limit=50' | jq -r '.[].eventName' | sort -u` lists them. With `--file <payload.json>`, it signs the payload with the secret of the seed's `github` or `gitlab` Connection and sends it: for a delivery that porthole does not have (`--file` does not sign for `jira`). It prints the status and the body of the response.
- **Schedules**: `bun instance scheduled <id> [Unix time in milliseconds]` runs the cron handler of the Worker once, as Cloudflare does each minute, at the given time or now. The local dev server runs no cron by itself.
- **Outbound requests**: `bun instance requests <id> <URL substring>` prints each request that the server sent to a matching URL, with its status and the request of the instance that caused it: `PUT 200 https://gitlab.com/api/v4/projects/1/hooks/2  <- POST /api/connections`. With `--capture`, the URL of a captured forge is its porthole source, such as `http://127.0.0.1:5200/_outbound/yapir-<id>-gitlab/…`: match on `gitlab`, not `gitlab.com`. It reads the traces of the Cloudflare Local Explorer. It shows no body.
- **Forge I/O**: `up --capture github,gitlab,jira` sends the API calls of the server to each listed forge through a porthole outbound source of the instance, `yapir-<id>-<forge>`, which forwards them to the real forge (`--capture gitlab` requires the seed because it reads the GitLab URL from it). `bun instance io <id> <forge>` prints each recorded call with its method, path and status, oldest first. `--bodies` adds the request and response bodies. The calls of the runner and the webhooks do not go through these sources.
- **Server logs**: `/tmp/yapir-instances/<id>/vite.log`. The logs of an execution are the logs of its container, `docker logs yapir-<execution ID>`, until it stops.

## 4. Evidence

The evidence of an instance is in `/tmp/yapir-instances/<id>/evidence/`. `down` keeps it. Put each artifact in a folder named after the feature ID:

- `bun instance browser <id> snapshot --filename=<feature>/<step>.md`: the ARIA snapshot, the proof to read.
- `bun instance browser <id> screenshot --filename=<feature>/<step>.png`: the proof to show.
- `bun instance cli <id> <command> > /tmp/yapir-instances/<id>/evidence/<feature>/<step>.json`: the stored state, read back through another surface. Create the folder first with `mkdir -p`.

The browser resolves `--filename` in the evidence folder, and creates the folders. A toast stays a few seconds: snapshot right after the click that shows it. playwright-cli also writes its automatic snapshots and console logs to `evidence/.playwright-cli/`.

A proof follows these rules:

- Exercise the path of a user: the UI, the CLI or the public API. Keep internal setters, direct database writes and test routes for the setup that `up` does.
- Capture the action and the resulting state, not only the final screen.
- Read each side effect back from another surface: a project created in the UI shows in `project list` of the CLI.
- Prefer a real delivery that porthole received to a built payload. A signed payload replaces the Git host at its boundary only: it must have the shape that the Git host sends.
- Do not create, comment on or change anything on GitHub, GitLab or Jira, unless the user asks. Agents act on the Git host when their triggers grant it.
- Report each journey that you could not drive, with the command and the missing precondition. A journey proved through another entry point stays unverified.

## 5. Cleanup

```sh
bun instance down <id>
```

`down` closes the browser, stops the process group of the instance, removes the containers, the volumes and the runner image of its executions, drops its database, deletes its porthole outbound sources, and removes its secrets and CLI home. It keeps `evidence/` and `vite.log` in `/tmp/yapir-instances/<id>/`. Run it after each verification, failed ones and failed launches included. `bun instance down --all` stops every instance of the checkout. Stop only the instances that you started: other instances, and the processes of the main checkout, belong to someone else.
