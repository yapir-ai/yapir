# Yapir

Yapir runs coding agents on your repositories. An event on GitHub, GitLab or Jira, a schedule, or a user starts an agent. The agent works in the CI of your repository, with the access that you give it.

You host your own instance. One instance serves one organization.

## How it works

- **Agent.** Instructions, a model and a harness: Claude Code, Codex or OpenCode. You bring the model provider.
- **Automation.** In a project, an automation gives an agent its triggers and its capabilities. A trigger selects events, such as a new issue or a cron schedule. A capability is a tool, such as a comment on a pull request or a push to a `yapir/*` branch.
- **Task.** A new event on the same pull request or issue continues the same task, with the session of the earlier executions.
- **Execution environment.** Each execution is a GitHub Actions or GitLab CI job of your repository, with its toolchain and its services.
- **Limited access.** The Git host tokens stay in the server. The agent reaches Git through the proxy of Yapir, and reaches only the hosts of the network policy of the organization.
- **Record.** Yapir keeps the transcript, the usage and the cost of each execution.

The [glossary](src/content/GLOSSARY.md) defines each term.

## Run an instance

An instance is a Cloudflare Worker or a container, with a PostgreSQL database and an OIDC provider for the sign-in. See [Deploy a Yapir instance](docs/deployment.md).

To set up a repository, paste this prompt into your coding agent. The agent installs the `yapir` CLI and prepares the CI job:

```text
Read https://<your instance>/api/content/onboarding.md and follow it.
```

Each instance serves its API reference at `/api/docs`. The CLI, `@yapir-ai/cli` on npm, has one command for each API route.

## Development

Requires Bun 1.4.3+, Node.js 24+ and Docker.

```sh
cp .env.example .env         # then set its values
docker compose up -d --wait  # PostgreSQL
bun install
bun instance up              # a disposable instance, with its own port and database
```

See [Local development](docs/local-development.md).

| Path | Content |
| --- | --- |
| `src/server` | The API. `cloudflare.ts` is the Worker entry point, `bun.ts` the container one |
| `src/web` | The frontend |
| `src/runner` | The runner, which drives the harness inside the execution environment |
| `cli` | The `yapir` CLI |
| `tests` | The Playwright tests |

| Command           | Purpose                                 |
| ----------------- | --------------------------------------- |
| `bun instance`    | Start, drive and stop local instances   |
| `bun run test`    | Run the Playwright tests on an instance |
| `bun db:generate` | Generate a Drizzle migration            |
| `bun fix`         | Apply lint fixes and format files       |
| `bun check`       | Check lint, formatting and types        |
| `bun run build`   | Check types and build the app           |

## Contributing

Yapir does not accept external pull requests for now. To report a bug or to propose a change, open an issue.

## License

[FSL-1.1-ALv2](LICENSE.md). You can use, change and host Yapir for any purpose other than a competing product or service. Each version becomes available under Apache 2.0 two years after its release.
