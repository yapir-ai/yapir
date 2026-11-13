# Projects group repositories

A project is the work scope of Yapir. It groups repositories of one Git host and holds the automations, the members and their roles, and the instructions of the project. A repository can belong to multiple projects. An automation works on all the repositories of its project, so one task can change several repositories and open one change request in each.

Before, the repository was the work scope, and there was intentionally no project abstraction. A change that spans a backend and its client then needed one task per repository, with no shared context. The project has one primary repository, its CI repository: by default, the first repository added. It only gives the CI repository of a new automation. It is not a second work scope next to the project, and the permissions do not depend on it.

## Consequences

- The members and roles move from the repository to the project. A repository has no members.
- The Git host tools take the repository as an input and accept only the repositories of the project.
- A CI execution environment runs in the CI of one repository, so the automation names that repository.
- The runner clones each repository of the project under one parent directory and starts the harness there. The harnesses then do not load the settings, hooks or MCP servers of the repositories, and Codex does not load their `AGENTS.md` or skills. The runner instructions list the repositories and tell the agent that their agent documents and skills are a reference. This is also true for a project with one repository.
- Each repository installs its own tools with mise. The mise shims select the tool versions of the directory in which a command runs.
