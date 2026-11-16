---
description: Principles to design agents, skills and automations, each with its reason, and two real setups. Read it before you design or change an agent or an automation.
---

# Good practices

These principles are a starting point, not a complete set of rules. Each one gives its reason. Adapt them to the need of the user. When a case is not here, apply the reasons. To know what Yapir offers, such as its capabilities and its event types, read `yapir --help` and the configuration pages.

## Put the method in skills

A skill holds the method: how to audit a repository, or how to find and fix a slow path. Keep Yapir out of it, with no branch names, schedules or limits. The same skill then runs in an execution and in a local session of a developer, and you can try it locally before you schedule it.

Take a skill from the source that fits it:

- The repository, for the conventions of the repository.
- Yapir, to share it with the organization. See `yapir skill --help`.
- A public repository that you trust, loaded by the instructions of the agent, such as `Load the skill at https://github.com/cloudflare/security-audit-skill`. The skill acts with the capabilities of the automation, so load it only from a source that you trust.

## Keep the Yapir wiring in the agent

The instructions of the agent name the skills to run, and add only what depends on Yapir:

- The branch name. Yapir accepts pushes to `yapir/` branches only, such as `yapir/signoz-<theme>`.
- The concurrency limit, such as `Do not start when 2 yapir/signoz-* branches already exist`.
- Where the results go, such as the labels of the issues.

Write the result that you expect, not the procedure. The agent then chooses its tools. A persona, such as "You are the production housekeeper", does not change the behavior. Leave it out.

Put the facts of a project, such as the name of its service in the observability tool, in the instructions of the project. An agent can then work on several projects. Put what changes between the automations of one agent, such as the repository to work on, in the instructions of the automation.

## Restrict with capabilities

The agent can ignore an instruction. It cannot use a capability that the automation does not give. Give each automation only the tools that its task needs, such as the read tools of an observability MCP server.

Prefer the scoped capabilities. A scoped read reaches the issues and change requests of the tasks of the automation, so the agent finds its own work without a search. Give an unscoped capability only when the task needs items outside this scope.

## Deliver a change request or an issue

A report has no owner and no state, and nobody reads the files that stay in the execution environment. Deliver each finding as one of these items:

- A change request, when the fix is clear. Put its proof in the description, such as a before and after measurement.
- An issue, when the finding needs a human decision.
- Nothing, when the run found nothing worth a change. The final message of the task tells it.

Mark the issues that wait for a human with one label that all agents share, such as `needs_validation`. One filter then shows all the decisions that wait. Create the labels on the Git host before the first run, with a description.

## Keep the state where the next task finds it

The executions of a task keep the files of the agent's home and workspace. Each scheduled occurrence starts a new task, without these files. Store what the next tasks need in the Git host:

- Push files to a branch, such as `yapir/security-audit-state`.
- Read the issues that the agent opened before, to update them instead of opening duplicates.

To let the agent answer comments on its change requests, add a comment trigger with the filter `yapir.task != null`. The comment then continues the task that opened the change request, in the same session. The instructions need no change.

## Give the Project Admin role

A Project User has read-only access. A Project Admin changes the instructions and the automations of the project. Give the Project Admin role to the people who work with the agents, so they can change the setup themselves.

## Iterate

1. Create the automation. Yapir creates it disabled.
2. Run it manually, and read the transcript of the execution.
3. Change the skill, the instructions or the capabilities, and run it again.
4. Enable it when the results are good.

To continue the session of a task on your machine, run `yapir task fork <taskId>`.

## Examples

### Fix production problems every week

The user wants an agent to find one problem in SigNoz each week, such as a slow path, an error that is a bug, or a log that reports a false failure. The agent fixes the cause and proves the fix with a local before and after.

- The skill `signoz-housekeeping` holds the method: explore SigNoz, reproduce locally, fix, measure again. It has no Yapir content.
- The instructions of the agent: `Run the signoz-housekeeping skill. Name your branch yapir/signoz-<theme>. Do not start when 2 yapir/signoz-* branches already exist.`
- The instructions of the project give the name of the service in SigNoz.
- The automation has a weekly schedule and a comment trigger. It gives the read tools of the SigNoz MCP server only, with push and the change request tools.

### Audit the security every month

The user wants the Cloudflare security audit on a repository, with each finding as an issue, and runs that build on the previous ones.

- The instructions of the agent load the skill from GitHub. They restore the output of the skill from `yapir/security-audit-state` before the run, and push it after.
- They open one issue labelled `security-audit` for each new finding, with `needs_validation` when a human must decide. They read the existing issues first, to update them instead of opening duplicates.
- The automation has a monthly schedule. It gives push, issue creation, scoped issue reads and unscoped issue updates, because a new task must update the issues of the previous tasks.
