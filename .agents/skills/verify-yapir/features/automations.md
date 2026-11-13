# Automations

A Project Admin creates an automation in a project: a name and an agent. The automation starts with the default triggers and capabilities of its agent, and runs in the CI execution environment of the CI repository of the project.

## Sub-features

- `automation-create`: create an automation from the project's **Automations** page or the CLI.
- `automation-list`: the automations of a project, on its **Automations** page and with `automation list --project-id`.
- `automation-ci-required`: Yapir refuses an automation in a project without a CI repository.

## How to get to it (user POV)

- A project, then **Automations**, then **Create automation**: `<url>/projects/<projectId>/automations/create`.
- `yapir automation create --data '<json>'`.

## Driving it with bun instance

Preconditions:

- An agent `Release reviewer`: run the [agent recipe](./agents.md) first.
- A project `Release train`: run the [project recipe](./projects.md) up to **Create**.
- For `automation-create` and `automation-list` only: a repository in the project, set as its **CI repository** on the **Settings** page. It needs the seed, which imports the repositories of its Connections. The seeded projects `GitHub playground` and `GitLab playground` already have one.

- **Open the form.** Run `bun instance browser $R goto <url>/projects/<projectId>`, `bun instance browser $R click 'role=link[name="Automations"]'`, then `bun instance browser $R click 'role=link[name="Create automation"]'`. The heading `Create automation` shows, with the textbox `Name` and the combobox `Agent`.
- **Fill.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Review merge requests"`, `bun instance browser $R click 'role=combobox[name="Agent"]'`, then `bun instance browser $R click 'role=option[name="Release reviewer"]'`.
- **Refuse without a CI repository.** Without the repository precondition, run `bun instance browser $R click 'role=button[name="Create automation"]'`. The URL stays on the form, and an alert says `A CI execution environment requires a CI repository, which must belong to the automation's project`. `$C automation list --project-id <projectId>` gives `{"items":[]}`.
- **Create.** With the repository precondition, the same click opens `<url>/projects/<projectId>/automations/<id>`.
- **Read back.** Run `$C automation list --project-id <projectId>`. One item, with the name `Review merge requests` and the `agentId` of `Release reviewer`.
- **Proof.** Run `bun instance browser $R snapshot --filename=automations/<step>.md` and `bun instance browser $R screenshot --filename=automations/<step>.png` after the refusal or the creation, and save the `automation list` output to `/tmp/yapir-instances/$R/evidence/automations/list.json`.

## Gotchas

- Without the seed, `automation-create` and `automation-list` are unreachable: report them as not driven with the missing seed, and prove only `automation-ci-required`.
- The form creates the automation on the CI of its CI repository. Its page then offers the **Execution environment** `Local`. The CLI takes `"dispatcher":"local"` at creation, without a CI repository: see [executions](./executions.md).
- The Git hosts deliver to porthole, not to the instance. Replay their events with `bun instance webhook`: see [events](./events.md).
- The form leaves the `Name` and the `Agent` filled after a refusal. A `goto` then opens a `beforeunload` dialog: run `bun instance browser $R dialog-accept`, or click **Cancel** first.
