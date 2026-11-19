# Executions

A user starts an automation manually with a message. Yapir creates a Task, queues an execution, and the dispatcher of the automation starts the runner with the agent's harness, model provider and model. The agent's reply is in the transcript of the execution. A user can stop an active execution, send a follow-up message to continue the same agent session, or fork the saved session locally.

## Sub-features

- `execution-manual`: start an automation with a message, from its page (**Start execution** dialog), the automations list or the CLI.
- `execution-harness`: the execution succeeds with each harness: `opencode`, `codex` and `claude-code`.
- `execution-transcript`: the Task page and `execution-message list` show the prompt and the reply.
- `execution-resume`: a message to the Task (from the Task page composer or CLI) starts a second execution that resumes the session of the first.
- `execution-stop`: stop a queued or running execution from the Task header or CLI (`task stop`).
- `execution-fork`: inspect (`task-session info`) or restore (`task fork` / **Copy fork command**) the saved harness session locally.

## How to get to it (user POV)

- A project, then **Automations**, then an automation: `<url>/projects/<projectId>/automations/<id>`. Its **Execution environment** combobox selects `Local`, and **Start execution** opens the manual start dialog (`Message` textbox + `Start` button).
- A project, then **Tasks** (`<url>/projects/<projectId>/tasks`), then a Task: `<url>/projects/<projectId>/tasks/<taskId>` (shows **Stop execution** while active, **Copy fork command**, and the `Message` / `Send` composer when the automation is enabled).
- `yapir automation-execution create <automationId> --data '{"message":"…"}'`, `yapir task list`, `yapir execution list --task-id <taskId>` and `yapir execution-message list --task-id <taskId>`.
- `yapir task-message create <taskId> --data '{"message":"…"}'`, `yapir task stop <taskId>`, `yapir task-session info <taskId>` and `yapir task fork <taskId>`.

## Driving it with bun instance

Preconditions:

- The seed with active model-provider credentials/subscriptions in `~/.config/yapir/seed.json`. `bun instance doctor $R` gives `ok` for `local runner image built` and `containers reach the server`.
- `P=/tmp/yapir-instances/$R/evidence/executions`, created with `mkdir -p $P`.

- **Start each harness.** For each `<harness>` of `opencode`, `codex` and `claude-code`, run `bun instance exec $R <harness> "Which harness runs you? Reply with its name." | tee $P/<harness>.txt`. It selects the oldest automation of an agent with this harness (in `GitHub playground` under the default seed), starts it, and waits for the Task to rest: 20 s to 2 min. The output gives `task <taskId>`, then `task idle`, `execution <id> succeeded`, `error: -`, the `usage` with tokens (and `cost`, or `null` when unpriced), and the `reply` of the agent, such as `OpenCode.` The exit code is `0`. The three commands can run in parallel.
- **UI manual start and stop.** Open `<url>/projects/<projectId>/automations/<automationId>`, click `role=button[name="Start execution"]`, fill `role=textbox[name="Message"]`, and click `role=button[name="Start"]`. The URL becomes `<url>/projects/<projectId>/tasks/<taskId>`. Run `$C task stop <taskId>` (or click `role=button[name="Stop execution"]`): status `204 No Content`, `task list --id <taskId>` gives `"state":"stopped"`, and `execution list --task-id <taskId>` gives `"outcome":"stopped"` with `stoppedById` set.
- **Resume.** A follow-up message requires `enabled: true` (`$C task-message create <taskId> --data '{"message":"test"}'` returns `409 AUTOMATION_DISABLED` while disabled), and an enabled automation needs a trigger. Run `$C automation update <automationId of opencode> --data '{"enabled":true,"triggers":[{"type":"schedule.cron","cron":"0 0 1 1 *"}]}'`: the local instance runs no cron, so the trigger never fires. Then run `bun instance exec $R --task <taskId of opencode> "What did I ask you before? Quote it." | tee $P/resume.txt` (or use the `Message` / `Send` composer on the Task page). A second execution of the same Task succeeds, and its reply quotes the first message.
- **Read back and fork.** Run `$C execution list --task-id <taskId> > $P/<harness>-executions.json` and `$C execution-message list --task-id <taskId> > $P/<harness>-messages.json`. For a Task with a completed turn, `$C task-session info <taskId>` returns the saved session and `$C task fork <taskId>` restores it in the instance CLI home and prints the local resume command.
- **UI proof.** Run `$C project list` for the ID of the automation's project (such as `GitHub playground`), then `bun instance browser $R goto <url>/projects/<projectId>/tasks/<taskId>`, `bun instance browser $R snapshot --filename=executions/<harness>.md` and `bun instance browser $R screenshot --filename=executions/<harness>.png`. Snapshot again until it shows the `Idle` Task state, the `Acknowledged` event states and the reply (only the latest execution is expanded by default on a multi-execution Task).

## Gotchas

- The reply does not always name the harness: `claude-code` can answer with the model name. The proof is the `succeeded` state and a reply.
- The seeded automations are disabled and have no trigger: a manual start runs a disabled automation; a follow-up message fails with `409 AUTOMATION_DISABLED`; triggered events silently skip disabled automations (`204` / `200 ok`). See the resume step and [events](./events.md).
- `execution-message list` gives the newest message first.
- The model of a `claude-code` agent on the Anthropic endpoint of a provider is not in the **Model** combobox of the UI when the catalog of the provider lists its OpenAI models. Type its ID, or create the agent with the CLI.
- The container runs with `--rm` and Docker removes it as soon as the execution stops: read `docker logs yapir-<execution ID>` while it runs, not after `exec` returns. The agent session stays in the Docker volume `yapir-state-<taskId>`, which a resumed execution mounts again.
- `exec` waits up to 15 min. A failing execution with pending events auto-retries up to 3 consecutive failures before the Task rests `blocked` (`exec` then prints the final `failed` error and exits `1`). Check `vite.log` and `execution list --task-id <taskId>`.
