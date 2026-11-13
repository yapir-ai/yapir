---
name: yapir
description: Yapir, at {{origin}}, runs agents on this project. Use to configure Yapir agents, automations and connections, to inspect its tasks and executions, or to install or share the organization's skills.
---

# Yapir

The `yapir` CLI acts on Yapir as the user, with their permissions, and prints JSON.

`yapir --help` defines Yapir's vocabulary and lists the command groups. `yapir <group> --help` lists a group's commands and their options.

Yapir's documentation is at {{origin}}/api/content.

When the CLI is not logged in, follow {{origin}}/api/content/onboarding.md.

To continue a task's session on this machine, run `yapir task fork <taskId>` in the directory that contains the checkouts of the project's repositories, each at its path on the Git host, then run the command that it prints.

## Skills

The organization shares skills in Yapir. To share a skill, create it with `yapir skill create`. To install a skill:

1. Read it with `yapir skill info <skillId>`.
2. Write its `SKILL.md`: a frontmatter with its `name` and `description`, then its `instructions` as the body.
3. Put the file in a directory with the skill's name, where your harness loads the project's skills. When the user asks, use the location of the user's skills.

When a skill with the same name is already installed, ask the user what to do.

To give skills to an agent, set their IDs in its `skillIds` with `yapir agent update`. Each execution of the agent receives them, as the skills of a repository.
