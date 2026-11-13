---
description: The changes of each Yapir release, for its users.
---

# Changelog

## v1.2.0 - 2026-11-12

### Agents

- Let an agent update an issue on GitHub or GitLab: its title, body, labels and state. On GitHub, the agent can also change the assignees. On GitLab, it can also change the confidentiality. Give its automation the **Update** issue capability.

## v1.1.0 - 2026-11-12

### Agents

- Let an agent open a confidential issue on GitLab.
- Automations receive the events of confidential GitLab issues and their comments. Yapir updates the webhooks of your GitLab projects automatically.

## v1.0.0 - 2026-11-12

### Tasks

- See the state of each task on its page and in the task list: Idle, Queued, Running, Blocked or Stopped. A task becomes Blocked when its executions fail too many times in sequence.
- Filter the tasks of a project by their state. This filter replaces the filter by the state of the latest execution.
- Stop a task from its page. In the API, stop it with `POST /api/tasks/:taskId/stop`.
- The task page no longer shows the message composer when the automation of the task is disabled.

### Agents

- Let an agent open an issue on GitHub or GitLab. Give its automation the **Create issue** capability. Yapir associates the issue with the task.

### Metrics

- Filter and group the executions by outcome. The executions that did not end show as **In progress**.

### Connections

- Create a GitLab connection with the signing token of an existing webhook, with the API or the CLI. The webhook deliveries stay valid.

### Interface

- Pages load faster.
