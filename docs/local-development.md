# Local development

Agents and developers run Yapir locally in disposable instances. An instance is a Vite dev server on a free port, with its own PostgreSQL database and an Organization Admin that is already signed in. `bun instance`, in `scripts/instance.ts`, starts, drives and stops the instances. Each checkout can run many instances at the same time.

## Worktree setup

T3 runs the scripts of `t3.json`:

- When it creates a worktree, it links `.env` from the main checkout and installs the dependencies.
- When a thread settles, it runs `bun instance down --all`, which stops the instances of the worktree.

## Instances

```sh
bun instance up [--no-seed] [--no-browser] [--capture github,gitlab,jira]
```

`up` prints the ID of the instance, its URL and a sign-in link. `bun instance` without a command lists all the commands. The skill `.agents/skills/verify-yapir/SKILL.md` tells how to drive an instance and how to capture proof.

The URL of an instance is `http://172.17.0.1:<port>`. `172.17.0.1` is the address of the host on the Docker bridge. The host and the containers of the local executions reach it. The firewall denies incoming connections on the public address, so the dev server listens on all interfaces.

To open an instance in a browser outside the host, use the sign-in link: `<service URL>/__dev/sign-in?token=<token>`. The service URL is `PORTHOLE_URL` with the port as a prefix of its host: `https://5173-porthole.example.com` for `PORTHOLE_URL=https://porthole.example.com` and the port `5173`. porthole opens the port on the host, and `bun instance up` adds the service host to the allowed hosts of the dev server. The dev server consumes the one-time token, sets the session cookie of the instance and opens `/`. `scripts/dev-sign-in.ts` implements this route: only the dev server has it. `bun instance sign-in <id>` gives a new link.

`.env` gives the OIDC application of the instances and `PORTHOLE_URL`. The instances do not use its other values.

`bun run test` starts one instance without the seed, runs the Playwright tests against it, then stops it.

## Seed

`up` applies `~/.config/yapir/seed.json` to the instance, through its API. The file contains the setup of the organization, with its secrets in clear text: keep its mode `0600`. `SeedSchema` in `scripts/seed.ts` gives its format: the request bodies of the API, with references by name.

The seed holds the model providers, the defaults, the Connections, the agents, the projects with their repositories and the automations of the organization.

## Local executions

`bun dev` adds the `local` execution environment, which only the dev server has. It builds the runner image of the worktree's sources when the server starts. Then it runs each execution of an automation with this environment in a Docker container of the host. A Docker volume keeps the `HOME` of the last successful execution of the task, as the CI cache does. `scripts/local-dispatcher.ts` names the image, the containers, the labels and the volumes.

`docker logs <container>` shows the runner output while the execution runs. Docker deletes the container when the runner exits. The `bun dev` output shows the errors of Docker.

`bun instance exec` starts an automation, or continues a task, and prints the result of the execution.

The CI execution environments cannot reach an instance: use the `local` execution environment.

## Webhooks

GitHub, GitLab and Jira send their webhooks to porthole, at `<PORTHOLE_URL>/api/webhooks/<source>`. porthole is a separate app on the development host: see [HCaupert/porthole](https://github.com/HCaupert/porthole). Its sources `github`, `gitlab` and `jira` verify the signatures with the secrets of the seed. porthole keeps each delivery for 7 days, and the last delivery of each event without a time limit.

`bun instance webhook <id> <source> <event>` replays the last delivery of an event to an instance. porthole signs the delivery again, thus an old GitLab delivery stays valid. For the porthole API, read `http://127.0.0.1:5200/llms.txt`.

The instances set `WEBHOOK_URL` to `PORTHOLE_URL`. Thus the GitLab Connection installs its webhook on porthole, not on the URL of the instance.

## Forge API calls

`up --capture` records the API calls of the server to GitHub, GitLab and Jira. For each listed forge, it creates a porthole outbound source `yapir-<id>-<forge>`, which forwards each call to its upstream. It sets the variable of the forge to the URL `http://127.0.0.1:5200/_outbound/<source>` of the source:

| Variable | Replaces | Upstream of the source |
| --- | --- | --- |
| `GITHUB_API_URL` | `https://api.github.com`. Also for the authentication of the GitHub App. | `https://api.github.com` |
| `GITLAB_API_URL` | The Connection URL, for API calls only. The Connection URL stays the host of clone URLs, webhooks and links. Yapir adds `/api/v4`. | The Connection URL |
| `JIRA_API_URL` | `https://api.atlassian.com`. | `https://api.atlassian.com` |

`bun instance io <id> <forge>` prints the recorded calls. `down` deletes the sources. When a variable is not set, Yapir calls the forge directly. The server does not send the calls of the runner and the webhooks through these URLs.
