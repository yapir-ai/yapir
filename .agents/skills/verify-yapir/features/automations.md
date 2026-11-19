# Automations

A Project Admin or Organization Admin creates an automation in a project with a name and an agent, edits its instructions, execution environment, triggers and capabilities, enables or disables it, and deletes or restores it. At creation, the automation copies only the agent's default triggers and capabilities that fit the project's Git host, and runs in the CI execution environment of the project's CI repository (or `local` when passed via the CLI).

## Sub-features

- `automation-create`: create an automation from the project's **Automations** page (form or **Agents to start from** gallery) or the CLI.
- `automation-list`: list a project's automations on its **Automations** page and with `automation list --project-id`.
- `automation-ci-required`: UI creation refuses an automation in a project without a CI repository.
- `automation-edit`: update instructions, execution environment, triggers, capabilities and enabled state on the automation page.
- `automation-delete`: soft-delete and restore an automation (deleting disables it; restoring keeps it disabled).

## How to get to it (user POV)

- A project, then **Automations** (`<url>/projects/<projectId>/automations`), then **Create automation**: `<url>/projects/<projectId>/automations/create`.
- An automation row in the list: `<url>/projects/<projectId>/automations/<id>`.
- `yapir automation list|info|create|update|delete|restore`.

## Driving it with bun instance

Preconditions:

- An agent `Release reviewer`: run the [agent recipe](./agents.md) first.
- A fresh project `Release train`: run the [project recipe](./projects.md) up to **Create**.
- For UI `automation-create`: a repository linked to the project (`$C project-repository create <projectId> --data '{"repositoryId":"<repoId>"}'`). Linking the first repository sets the project's **CI repository** automatically (needs the seed, which imports repositories; the seeded projects `GitHub playground` and `GitLab playground` already have one and 3 harness automations).

- **Open the form.** Run `bun instance browser $R goto <url>/projects/<projectId>`, `bun instance browser $R click 'role=link[name="Automations"]'`, then `bun instance browser $R click 'role=link[name="Create automation"]'`. The heading `Create automation` shows, with the textbox `Name` and the combobox `Agent`.
- **Fill.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Review merge requests"`, `bun instance browser $R click 'role=combobox[name="Agent"]'`, then `bun instance browser $R click 'role=option[name="Release reviewer"]'`.
- **Refuse without a CI repository.** Without a repository linked to the project, run `bun instance browser $R click 'role=button[name="Create automation"]'`. The URL stays on the form, and an alert says `A CI execution environment requires a CI repository, which must belong to the automation's project`. `$C automation list --project-id <projectId>` gives `{"items":[]}`. Leave the dirty form cleanly with `bun instance browser $R click 'role=link[name="Cancel"]'`, then `bun instance browser $R click 'role=button[name="Discard changes"]'`.
- **Create.** After linking a repository to the project, the same submit opens `<url>/projects/<projectId>/automations/<id>` and shows the toast `Automation created`. Keep `<id>`.
- **Read back.** On a fresh project, `$C automation list --project-id <projectId>` gives one item with `"name":"Review merge requests"`, `"enabled":false`, and the `agentId` of `Release reviewer`.
- **Edit, enable, delete and restore.** On `/projects/<projectId>/automations/<id>`, fill `role=textbox[name="Instructions"]` with `"Check tests."`, click `role=button[name="Add trigger"]`, select `Event` (`Schedule`), fill `role=textbox[name="Cron (UTC)"]` with `"0 9 * * 1-5"`, press `Escape`, click `role=button[name="Save automation"]`, then toggle `role=switch[name="Enabled"]`. `$C automation info <id>` shows `"instructions":"Check tests."`, the schedule trigger and `"enabled":true`. Delete via `role=button[name="Delete automation"]` then `role=button[name="Confirm deletion?"]` (`enabled: false`, non-null `deletedAt`); click `role=button[name="Show deleted"]`, open `Review merge requests` and click `role=button[name="Restore automation"]` (`deletedAt: null`, `enabled: false`).
- **CLI local create (no repository needed).** Run `$C automation create --data '{"name":"CLI local","agentId":"<agentId>","projectId":"<projectId>","dispatcher":"local"}'`. Status `201 Created`, with `"dispatcher":"local"` and `"ciRepositoryId":null`.
- **Proof.** Run `bun instance browser $R snapshot --filename=automations/<step>.md` and `bun instance browser $R screenshot --filename=automations/<step>.png` after the refusal and creation, and save `automation list` to `/tmp/yapir-instances/$R/evidence/automations/list.json`.

## Gotchas

- Without the seed, UI `automation-create` is unreachable because a project has no repository to use as its CI repository: report UI creation as not driven with the missing seed, and prove `automation-ci-required` plus CLI creation with `"dispatcher":"local"` and `automation-list`.
- The UI form creates the automation on the CI of its CI repository. Its detail page then offers **Execution environment** `Local`.
- The `Agent` combobox shows up to 10 options initially: if more than 10 agents exist, type in `Search agents` before clicking `role=option`.
- The `Enabled` switch stays disabled until the automation has at least one saved trigger (`400 AUTOMATION_REQUIRES_TRIGGER` via API).
- The Git hosts deliver to porthole, not to the instance. Replay their events with `bun instance webhook`: see [events](./events.md).
- After a refusal, `Name` and `Agent` stay filled. Clicking **Cancel** opens the `Discard unsaved changes?` dialog (`role=button[name="Discard changes"]`); a `goto` opens a `beforeunload` dialog (`bun instance browser $R dialog-accept`).
