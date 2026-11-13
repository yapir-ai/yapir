# Executions

A user starts an automation manually with a message. Yapir creates a Task, queues an execution, and the dispatcher of the automation starts the runner with the agent's harness, model provider and model. The agent's reply is in the transcript of the execution. A second message to the Task continues the same agent session.

## Sub-features

- `execution-manual`: start an automation with a message, from its page or the CLI.
- `execution-harness`: the execution succeeds with each harness: `opencode`, `codex` and `claude-code`.
- `execution-transcript`: the Task page and `execution-message list` show the prompt and the reply.
- `execution-resume`: a message to the Task starts a second execution, which resumes the session of the first.

## How to get to it (user POV)

- A project, then **Automations**, then an automation: `<url>/projects/<projectId>/automations/<id>`. Its **Execution environment** combobox selects `Local`.
- A project, then **Tasks**, then a Task: `<url>/projects/<projectId>/tasks/<taskId>`.
- `yapir automation-execution create <automationId> --data '{"message":"…"}'`, then `yapir execution list --task-id <taskId>` and `yapir execution-message list --task-id <taskId>`.
- `yapir task-message create <taskId> --data '{"message":"…"}'`.

## Driving it with bun instance

Preconditions:

- The seed. `bun instance doctor $R` gives `ok` for `local runner image built` and `containers reach the server`.
- `P=/tmp/yapir-instances/$R/evidence/executions`, created with `mkdir -p $P`.

- **Start each harness.** For each `<harness>` of `opencode`, `codex` and `claude-code`, run `bun instance exec $R <harness> "Which harness runs you? Reply with its name." | tee $P/<harness>.txt`. It selects the automation of the agent with this harness in `GitHub playground`, starts it, and waits for the end of its execution: 20 s to 2 min. The output gives `task <taskId>`, then `task idle`, `execution <id> succeeded`, `error: -`, the `usage` with tokens and a `cost`, and the `reply` of the agent, such as `OpenCode.` The exit code is `0`. The three commands can run in parallel.
- **Resume.** A message respects `enabled`, and an enabled automation needs a trigger. Run `$C automation update <automationId of opencode> --data '{"enabled":true,"triggers":[{"type":"schedule.cron","cron":"0 0 1 1 *"}]}'`: the local instance runs no cron, so the trigger never fires. Then run `bun instance exec $R --task <taskId of opencode> "What did I ask you before? Quote it." | tee $P/resume.txt`. A second execution of the same Task succeeds, and its reply quotes the first message: `You asked: "Which harness runs you? Reply with its name."`
- **Read back.** Run `$C execution list --task-id <taskId> > $P/<harness>-executions.json` and `$C execution-message list --task-id <taskId> > $P/<harness>-messages.json`.
- **UI proof.** Run `$C project list` for the ID of `GitHub playground`, then `bun instance browser $R goto <url>/projects/<projectId>/tasks/<taskId>`, `bun instance browser $R snapshot --filename=executions/<harness>.md` and `bun instance browser $R screenshot --filename=executions/<harness>.png`. Snapshot again until it shows the `Idle` Task state, the `Acknowledged` event states and the reply: the first snapshot after a `goto` can show the page while it loads.

## Gotchas

- The reply does not always name the harness: `claude-code` can answer with the model name. The proof is the `succeeded` state and a reply.
- The seeded automations are disabled and have no trigger: a manual start runs a disabled automation, an event or a message does not (`409 AUTOMATION_DISABLED`). See the resume step and [events](./events.md).
- `execution-message list` gives the newest message first.
- The model of a `claude-code` agent on the Anthropic endpoint of a provider is not in the **Model** combobox of the UI when the catalog of the provider lists its OpenAI models. Type its ID, or create the agent with the CLI.
- The container stops at the end of the execution and Docker removes it: read `docker logs yapir-<execution ID>` while it runs. The agent session stays in the Docker volume `yapir-state-<taskId>`, which a resumed execution mounts again.
- `exec` waits up to 15 min. A `failed` execution prints its `error`: read `vite.log` and the container logs.
