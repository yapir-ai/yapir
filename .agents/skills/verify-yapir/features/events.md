# Events

A Git host or Jira delivers a webhook, or the cron of the Worker ticks. Yapir turns it into an event, finds the enabled automations with a trigger of its type, and adds the event to their Task: a new Task, or the Task that already holds the resource of the event. The Task then gets an execution.

## Sub-features

- `event-github`: a GitHub delivery, such as `issues.opened`, starts a Task of an automation with the trigger `github.issues.opened`.
- `event-gitlab`: a GitLab delivery, such as an `issue` hook with the action `open`, starts a Task of an automation with the trigger `gitlab.issue.open`.
- `event-jira`: a Jira delivery, such as `comment_created`, starts a Task of an automation with the trigger `jira.comment_created`.
- `event-continue`: a second event about the same resource goes to the same Task.
- `event-schedule`: a cron tick starts a Task of an automation with a `schedule.cron` trigger whose pattern matches the minute.
- `event-ignored`: a delivery with no matching trigger (such as `github.push` when unconfigured) or with an unregistered event type (such as `star`) starts nothing and gets `204`.

## How to get to it (user POV)

- GitHub, GitLab or Jira sends a signed webhook to `<url>/api/webhooks/github`, `<url>/api/webhooks/gitlab` or `<url>/api/webhooks/jira`. Yapir verifies the signature with the Connection's secret.
- Cloudflare runs the cron of the Worker each minute.
- The triggers of an automation: its page, `<url>/projects/<projectId>/automations/<id>`, or `yapir automation update <id> --data '{"triggers":[…]}'`.
- Accepted events on a Task: the Task page or `yapir event list --task-id <taskId>`.

## Driving it with bun instance

Preconditions:

- The seed. The Git hosts and Jira deliver to porthole, at `<PORTHOLE_URL>/api/webhooks/<source>`, and porthole keeps the deliveries. `bun instance webhook` replays them: the payloads are real, and you create nothing on the external services.
- `P=/tmp/yapir-instances/$R/evidence/events`, created with `mkdir -p $P`.
- The stored events: `curl -s 'http://127.0.0.1:5200/api/exchanges?source=github&limit=100' | jq -r '.[].eventName' | sort -u`, and the same with `source=gitlab` and `source=jira`. A recipe step needs its event in this list.

- **Find the automations.** Run `$C project list` for the IDs of `GitHub playground` and `GitLab playground`, then `$C automation list --project-id <projectId>`. Keep the ID of the automation `OpenCode` of each project.
- **Give them triggers and enable them.** An automation without triggers gets no event. In the GitHub project, run `$C automation update <automationId> --data '{"enabled":true,"triggers":[{"type":"github.issues.opened","expression":"true"},{"type":"github.issues.labeled","expression":"yapir.task != null"}]}'` (use any second event type that porthole recorded for the same issue, such as `issues.labeled`, `issues.edited` or `issue_comment.created`). In the GitLab project, run the same with `[{"type":"gitlab.issue.open","expression":"true"},{"type":"schedule.cron","cron":"* * * * *"},{"type":"jira.comment_created","expression":"true"}]`. Status `200 OK`, with `"enabled":true`.
- **Deliver a GitHub issue.** Run `bun instance webhook $R github issues.opened | tee $P/github-issues.txt`. It prints `204`. `$C task list --automation-id <GitHub automationId>` gives one new Task. `$C execution list --task-id <taskId>` gives its execution and `$C event list --task-id <taskId>` shows `github.issues.opened`.
- **Continue.** If porthole has a second event (such as `issues.labeled` or `issue_comment.created`) about the same issue, run `bun instance webhook $R github <event>`. It prints `204`, `task list` keeps the same Task count, and `$C event list --task-id <taskId>` shows both events. Else, report `event-continue` as not driven, with the missing delivery.
- **Ignore a delivery.** Run `bun instance webhook $R github push` (a registered event type with no matching trigger) or an unregistered event via `--file` (such as `echo '{"action":"created"}' > $P/star.json && bun instance webhook $R github star --file $P/star.json`). Both print `204`, and `task list` does not change.
- **Deliver a GitLab issue and a Jira event.** Run `bun instance webhook $R gitlab issue.open | tee $P/gitlab-issue.txt` and `bun instance webhook $R jira comment_created | tee $P/jira-comment.txt`. Each prints `204` and adds one Task to `$C task list --automation-id <GitLab automationId>`.
- **Schedule.** Run `bun instance scheduled $R`. It prints `200 ok`. `task list --automation-id <GitLab automationId>` gives one more Task, for the minute.
- **Proof.** Save the outputs of `task list`, `event list` and `execution list` in `$P`. Then open each Task page, `bun instance browser $R goto <url>/projects/<projectId>/tasks/<taskId>`, and take a snapshot and a screenshot.

## Gotchas

- The replay signs the delivery again with the secret of the porthole source, which is the secret of the seed's Connection: an old GitLab delivery stays valid.
- The replay replaces only the external service: Yapir then calls the real API when the event needs it, with the credentials of the Connection. The resource of the delivery can be closed or deleted since: read the `reply` of the agent and `vite.log`.
- The seed's agents reply in one sentence and call no tool. Triggers themselves grant read capabilities; an agent with additional write capabilities and instructions can act on the Git host: do not give such an agent a trigger on a real repository.
- For a delivery that porthole does not have, build the payload and run `bun instance webhook $R <github | gitlab> <GitHub event> --file <payload.json>` (`--file` signs for `github` and `gitlab` only, not `jira`). The GitHub event is the header `X-GitHub-Event`, such as `issues`; GitLab reads the kind from the payload. The payload must have the shape that the Git host sends: the schemas are in `src/server/lib/github/` and `src/server/lib/gitlab/`.
- `github.push`, `gitlab.push` and `gitlab.tag_push` are registered event types in Yapir. Use an event outside the catalog (such as `star`) to test the unregistered-event early return.
- `cronDispatch` claims at most one tick per UTC minute (`cron_tick`). Calling `bun instance scheduled $R` twice in the same UTC minute returns `200 ok` as a no-op; pass a later Unix ms timestamp to trigger another minute.
- An event of an automation's own action does not trigger the same automation.
- `requests` shows no request from a cron tick: the traces of the cron have no request of the instance as their root.
- `automation update` replaces the whole `triggers` array.
- The state of a Task is in `task list --id <taskId>`; the outcome of each attempt is in `execution list --task-id <taskId>`.
- A malformed GitHub or GitLab payload for a registered event gets `500`, and `vite.log` has the `ZodError` with the path of the bad field (non-JSON bodies on Jira or custom webhooks get `400 WEBHOOK_BODY_INVALID`; unregistered events skip schema parsing and get `204`).
