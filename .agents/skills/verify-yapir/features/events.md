# Events

A Git host delivers a webhook, or the cron of the Worker ticks. Yapir turns it into an event, finds the enabled automations with a trigger of its type, and adds the event to their Task: a new Task, or the Task that already holds the resource of the event. The Task then gets an execution.

## Sub-features

- `event-github`: a GitHub delivery, such as `issues.opened`, starts a Task of an automation with the trigger `github.issues.opened`.
- `event-gitlab`: a GitLab delivery, such as an `issue` hook with the action `open`, starts a Task of an automation with the trigger `gitlab.issue.open`.
- `event-continue`: a second event about the same resource goes to the same Task.
- `event-schedule`: a cron tick starts a Task of an automation with a `schedule.cron` trigger whose pattern matches the minute.
- `event-ignored`: a delivery that has no event type in Yapir, such as `push` without a matching trigger, starts nothing, and gets `204`.

## How to get to it (user POV)

- A Git host sends a webhook to `<url>/api/webhooks/github` or `<url>/api/webhooks/gitlab`. The Connection of the Git host signs it.
- Cloudflare runs the cron of the Worker each minute.
- The triggers of an automation: its page, `<url>/projects/<projectId>/automations/<id>`, or `yapir automation update <id> --data '{"triggers":[…]}'`.

## Driving it with bun instance

Preconditions:

- The seed. The Git hosts deliver to porthole, at `<PORTHOLE_URL>/api/webhooks/<source>`, and porthole keeps the deliveries. `bun instance webhook` replays them: the payloads are real, and you create nothing on the Git hosts.
- `P=/tmp/yapir-instances/$R/evidence/events`, created with `mkdir -p $P`.
- The stored events: `curl -s 'http://127.0.0.1:5200/api/exchanges?source=github&limit=100' | jq -r '.[].eventName' | sort -u`, and the same with `source=gitlab`. A recipe step needs its event in this list.

- **Find the automations.** Run `$C project list` for the IDs of `GitHub playground` and `GitLab playground`, then `$C automation list --project-id <projectId>`. Keep the ID of the automation `OpenCode` of each project.
- **Give them triggers and enable them.** An automation without triggers gets no event. In the GitHub project, run `$C automation update <automationId> --data '{"enabled":true,"triggers":[{"type":"github.issues.opened","expression":"true"},{"type":"github.issue_comment.created","expression":"yapir.task != null"}]}'`. In the GitLab project, run the same with the triggers `[{"type":"gitlab.issue.open","expression":"true"},{"type":"schedule.cron","cron":"* * * * *"}]`. Status `200 OK`, with `"enabled":true`.
- **Deliver a GitHub issue.** Run `bun instance webhook $R github issues.opened | tee $P/github-issues.txt`. It prints `204`. `$C task list --automation-id <GitHub automationId>` gives one Task. `$C execution list --task-id <taskId>` gives its execution.
- **Continue.** If porthole has an `issue_comment.created` delivery about the same issue, run `bun instance webhook $R github issue_comment.created`. It prints `204`, and `task list` still gives one Task. Else, report `event-continue` as not driven, with the missing delivery.
- **Ignore a delivery.** Run `bun instance webhook $R github push`. It prints `204`, and `task list` does not change.
- **Deliver a GitLab issue.** Run `bun instance webhook $R gitlab issue.open | tee $P/gitlab-issue.txt`. It prints `204`. `$C task list --automation-id <GitLab automationId>` gives one Task.
- **Schedule.** Run `bun instance scheduled $R`. It prints `200 ok`. `task list --automation-id <GitLab automationId>` gives one more Task, for the minute.
- **Proof.** Save the outputs of `task list` and `execution list` in `$P`. Then open each Task page, `bun instance browser $R goto <url>/projects/<projectId>/tasks/<taskId>`, and take a snapshot and a screenshot.

## Gotchas

- The replay signs the delivery again with the secret of the porthole source, which is the secret of the seed's Connection: an old GitLab delivery stays valid.
- The replay replaces only the Git host: Yapir then calls the real API of the Git host when the event needs it, with the credentials of the Connection. The resource of the delivery can be closed or deleted since: read the `reply` of the agent and `vite.log`.
- The seed's agents reply in one sentence and call no tool. An agent with other instructions can act on the Git host with the capabilities that its triggers grant: do not give such an agent a trigger on a real repository.
- For a delivery that porthole does not have, build the payload and run `bun instance webhook $R <github | gitlab> <GitHub event> --file <payload.json>`. It signs the payload with the secret of the seed's Connection. The GitHub event is the header `X-GitHub-Event`, such as `issues`; GitLab reads the kind from the payload. The payload must have the shape that the Git host sends: the schemas are in `src/server/lib/github/` and `src/server/lib/gitlab/`.
- An event of an automation's own action does not trigger the same automation.
- `requests` shows no request from a cron tick: the traces of the cron have no request of the instance as their root.
- `automation update` replaces the whole `triggers` array.
- The state of a Task is in `task list --id <taskId>`; the outcome of each attempt is in `execution list --task-id <taskId>`.
- A malformed payload gets `500`, and `vite.log` has the `ZodError` with the path of the bad field.
