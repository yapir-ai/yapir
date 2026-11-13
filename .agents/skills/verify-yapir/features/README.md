# Yapir verification map

This folder is the maintained source for the verification of the user-facing behavior of Yapir. Read this index, then use the file of the feature as the recipe.

## Baseline preconditions

- An instance started with `bun instance up`, and `bun instance doctor <id>` with only `ok` lines.
- `<url>` is the URL that `up` printed.
- The signed-in user is `Instance Admin <admin@yapir.test>`, Organization Admin.
- Without a seed, the database is empty: no project, agent, model provider, Connection or repository.
- With the seed of `~/.config/yapir/seed.json`, the instance has:
  - the model providers of the seed, and the defaults;
  - the GitHub, GitLab and Jira Connections, with the repositories that `$C repository list` gives;
  - the agents `OpenCode`, `Codex` and `Claude Code`, one for each harness, and `Reviewer`, `Implementer` and `Housekeeper`, which the defaults create;
  - the projects `GitHub playground` and `GitLab playground`, each with the repositories of its Git host;
  - in each project, one disabled automation for each harness agent, named after the agent, on the `local` dispatcher, without triggers.

  A recipe that needs the seed says so. A recipe that creates its own resources gives them names that the seed does not use.

## Driving conventions

- Start each recipe from the baseline, plus the preconditions of the recipe.
- The recipes use the shell variables `R=<instance ID>` and `C="bun instance cli $R"`. Set them first.
- A `snapshot` right after a `goto` can show an empty page while it loads. Snapshot again until the page shows its content.
- Target elements by ARIA role and accessible name: `role=<role>[name="<name>"]`.
- Comboboxes open on a click. Type to filter the options, then click the option.
- Leave a form with its **Cancel** link or its submit button. A `goto` from an edited form opens a `beforeunload` dialog: run `bun instance browser $R dialog-accept`.
- Read IDs from the URL that a click prints (`Page URL`) or from the CLI output.

## Proof and skip reporting

- Store the artifacts in `evidence/<feature ID>/`.
- UI proof: an ARIA snapshot and a screenshot of the result.
- Mutation proof: the stored value, read back with the CLI.
- Report each unreachable journey with the command and the missing precondition.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph on the user-visible behavior, then has these four H2 sections, in this order:

1. `Sub-features`: short IDs, one line each.
2. `How to get to it (user POV)`: every user entry point.
3. `Driving it with bun instance`: `Preconditions:`, then labeled bullets that pair each action with the exact command and the observable result.
4. `Gotchas`: traps that waste or invalidate an instance.

## Features

- [Projects](./projects.md): create, edit, delete and restore a project, from the UI and the CLI.
- [Model providers](./model-providers.md): add a model provider from the catalog.
- [Agents](./agents.md): create an agent with a harness, a model provider and a model.
- [Automations](./automations.md): create an automation of an agent in a project. It needs a repository.
- [Executions](./executions.md): start an automation manually, with each harness, and continue its Task. It needs the seed.
- [Events](./events.md): Git host deliveries and cron ticks start and continue Tasks. It needs the seed.
- [Connections](./connections.md): the Git host Connections, their calls to the Git host, their webhook and their repositories. It needs the seed.
- [API keys and CLI login](./api-keys.md): create an API key in the UI and log in the CLI with it.

Not mapped yet: the Assistant, Skills, MCP servers, Webhooks, Metrics, Users, Defaults and the network policy.
