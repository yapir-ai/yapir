---
description: The changes of each Yapir release, for its users.
---

# Changelog

## v1.5.1 - 2026-11-19

### Bug Fixes

- **deps:** upgrade vite for GHSA-p4f5-76q4-ffq7 and upgrade all dependencies ([#6](https://github.com/yapir-ai/yapir/issues/6)) ([16ef7b2](https://github.com/yapir-ai/yapir/commit/16ef7b2752ad20bd7caf9544a3ba25df96fde192))
- **runner:** append the instructions to the OpenCode system prompt ([#8](https://github.com/yapir-ai/yapir/issues/8)) ([e326d48](https://github.com/yapir-ai/yapir/commit/e326d48a229ffbdf36acc97703fb53c0acf4526e))
- **runner:** keep the turn open while a background command runs ([#7](https://github.com/yapir-ai/yapir/issues/7)) ([38e12fc](https://github.com/yapir-ai/yapir/commit/38e12fc0f9407312ecc66dcd7a73311167751390))
- **runner:** tell the agent that Docker is available ([#4](https://github.com/yapir-ai/yapir/issues/4)) ([4934077](https://github.com/yapir-ai/yapir/commit/49340770c58484dd411f1bc099af087c15b8b313))

## v1.5.0 - 2026-11-16

### Features

- add instructions to automations ([#1](https://github.com/yapir-ai/yapir/issues/1)) ([79333ad](https://github.com/yapir-ai/yapir/commit/79333adc8f68f45797446fbc623c2e79656e1cac))

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
