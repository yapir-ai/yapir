---
description: The vocabulary of Yapir, with what each term means and which synonyms to avoid. Read it before you name a Yapir concept.
---

# Yapir

Yapir coordinates agents and humans around connected tools, with software development as its initial focus.

## Language

**Agent**: A reusable configuration of instructions, a model of a model provider, a harness, and the default triggers and capabilities of its automations, independent of any project. Reviewer, housekeeper, and implementer are examples of agent configurations rather than fixed roles. _Avoid_: Task, execution

**Skill**: Instructions in the Agent Skills format that a user shares with the organization, or that a repository contains. Agents select shared skills to receive them in their executions. _Avoid_: Prompt

**Automation**: A configuration within a project that brings together one agent, instructions, event triggers, and tool capabilities. _Avoid_: Agent repository, agent

**Task**: A piece of work of one automation toward one objective, carried out by its agent over one or more executions. _Avoid_: Execution, agent

**Execution**: An activation of an agent to advance a task, processing the task's pending events as successive turns of one session. _Avoid_: Task, agent, run, job

**Usage**: The tokens that an execution consumed, by type, and their cost. _Avoid_: Consumption, billing

**Metrics**: The aggregates of the executions of the last 30 days and of their effects, by dimension, such as agent or project, and by period. _Avoid_: Analytics, statistics, usage

**Event**: A fact received or produced by Yapir, such as an issue changing status, a comment being posted, or a scheduled time being reached. _Avoid_: Trigger

**Trigger**: A rule within an automation selecting which events activate its agent, using criteria such as label membership or an external project's identity. _Avoid_: Event

**Task association**: An explicit relationship between a task and an external resource, such as an issue, change request, or discussion, that identifies the task concerned by later events. _Avoid_: Continuity link

**Scoped tool**: An operation made available to an execution with its targets and actions constrained to the work concerned, such as a comment tool bound to the associated change request. _Avoid_: Unrestricted connection access

**Session**: The conversational context that a harness keeps across the turns and executions of a task. _Avoid_: Task, execution

**Transcript**: The messages of an execution's turns, as its harness emitted them. _Avoid_: Logs, history, conversation

**Model provider**: An organization's access to a source of models, with its endpoint and API key, selected by agents. _Avoid_: Connection, credential, harness

**Provider catalog**: The known sources of models and their models, from which model providers are configured. _Avoid_: Model provider

**Harness**: An existing agent execution system driven by Yapir that manages the agent's conversation and tool use, such as Codex, Claude Code, or OpenCode. _Avoid_: Agent, model provider

**Execution environment**: The environment in which a runner, its harness, and their commands execute, such as a container or a CI job. _Avoid_: Runtime

**Runner**: The Yapir process inside an execution environment that claims an execution and drives its harness locally. _Avoid_: Daemon, worker, sandbox

**Network policy**: The organization's list of hosts that its executions may reach. _Avoid_: Firewall, egress allowlist

**Injected credential**: A secret of an execution environment that the runner adds to the agent's requests to a URL prefix, without the agent holding it. _Avoid_: Agent secret, token forwarding

**Assistant**: The conversational helper built into Yapir that answers users' questions about Yapir and guides them through its configuration. _Avoid_: Agent, Yapir agent

**Defaults**: The organization's single default configuration, from which new agents, new automations, and the Assistant take their model, harness, and execution environment. _Avoid_: Assistant configuration, settings

**Conversation**: A user's private exchange with the Assistant. _Avoid_: Session, chat

**Organization**: The single team or organization served by a Yapir instance, encompassing its users, projects, repositories, and connected services. _Avoid_: Tenant, project

**Project**: A work scope that groups repositories and holds their automations, members, and instructions. _Avoid_: Workspace, repository group, tenant

**Repository**: A Git repository of a Git host, known to Yapir, that projects link. _Avoid_: Project, working repository

**Connection**: The organization's configured access to an external service, such as GitHub, a GitLab instance, or a Jira Cloud site. _Avoid_: Connector, integration settings

**MCP server**: A remote MCP server configured by the organization, whose tools Yapir proxies to agents. _Avoid_: Connection, connector

**Webhook**: An endpoint configured by the organization whose deliveries are events. _Avoid_: Connection, integration

**Git host**: A connected Git hosting service, such as GitHub or a GitLab instance, from which Yapir knows repositories. _Avoid_: Origin, repository

**Organization Admin**: An organization role with administration rights throughout Yapir. _Avoid_: Project Admin

**Organization User**: An organization member without organization administration rights. _Avoid_: Project User

**Project Admin**: A project role with administration rights on the project's configuration. _Avoid_: Organization Admin, Repository Admin

**Project User**: A project role with read-only access to the project in Yapir. _Avoid_: Organization User, Repository User
