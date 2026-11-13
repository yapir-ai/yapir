---
description: Steps for a user's coding agent to set up the Yapir CLI and the user's repository. Follow it when the user asks you to set up Yapir.
---

# Yapir onboarding

These steps connect your user and their repository to Yapir, at {{origin}}. Yapir runs agents on projects: a project groups repositories, and activity on one of them, such as a pull request or a comment, activates the project's agents. An agent works on all the repositories of its project.

This is possibly the user's first contact with Yapir. Guide them through it:

- Start with a welcome: say that this session is the Yapir onboarding, that your role is to guide them through the setup, and what Yapir does for them. Then give the list of steps, each with what it gives them.
- Go through the steps one at a time. For each step, say where you are in the list and what the step gives them, act once they agree, and report the result. Report and skip a step that is already done.
- Speak about results for the user, not about your actions. Do not announce how you read documents or which commands you run.
- At the end, sum up what is set up and what they can do next: create an automation in their project on {{origin}}, and ask the Assistant on that site for help.

Changes to the repository follow the repository's way, found in step 1. When a skill or guideline describes how to make changes, offer to use it. Otherwise, offer to make the changes on a branch from the integration branch, for the user to review and commit. The user, or the skill they choose, commits.

## 1. Explore

Find:

- The repository: the Git repository of the working directory. Outside a repository, ask the user for their repository's path. Without a repository, run steps 2, 3 and 6 only.
- Its Git host, from the `origin` remote: GitHub, GitLab or another.
- Your harness, and where it loads skills in a repository and for a user.
- How the repository integrates changes: its integration branch, and the skills or guidelines (`AGENTS.md`, `CLAUDE.md`, contribution docs) that tell agents how to commit and open a pull or merge request.
- The package managers available to install an npm package.

Done when each item is found or known to be absent.

## 2. Install the CLI

The `yapir` command comes from the npm package `@yapir-ai/cli`. Install it globally.

Done when `yapir --help` runs.

## 3. Log in

Ask the user to create an API key on {{origin}}/api-keys and to run the login command the page shows, then to tell you when it is done. The key stays out of the conversation.

In a repository, write `{"url": "{{origin}}"}` to `yapir.json` at its root. In the repository, the CLI then uses this instance, even when the user logged in to others.

Done when `yapir project list` succeeds.

## 4. Find the project in Yapir

`yapir repository list` lists the repositories of the projects that the user can read. Look for the repository by its path on the Git host. Then `yapir project list --repository-id <repositoryId>` lists the projects that contain it. When there are several, ask the user which project to use.

When the repository is absent, `yapir connection list` shows if Yapir has a connection to the repository's Git host. Without it, ask the user to have an Organization Admin of Yapir connect the Git host, as {{origin}}/api/content/connections/github.md or {{origin}}/api/content/connections/gitlab.md describes. With it, ask the user to have an Organization Admin do these steps:

1. Import the repository, on the Git host: on GitHub, give Yapir's GitHub App access to the repository; on GitLab, give Yapir's GitLab user the Maintainer role in the repository's project, then click **Sync projects** on the GitLab connection page.
2. On {{origin}}/projects, create a project, or open an existing one, and add the repository on its **Repositories** page. The repositories of a project share one Git host.
3. On the **Members** page of the project, add the user. A Project Admin edits the project's instructions and automations.

Check again once the user confirms.

Done when a project of the user contains the repository, or the user moves on without it: then skip step 5.

## 5. Set up the CI execution environment

An automation runs its agents in the CI of one repository of its project, its CI repository, where they get the toolchain and services of that repository. A new automation uses the CI repository of its project: the first repository added, which the user can change in the project's settings. On the automation's page in Yapir, the user selects the CI repository of the automation. This needs a job in the CI repository, described in the instructions for its Git host:

- GitHub Actions: {{origin}}/api/content/execution-environments/github-actions.md
- GitLab CI: {{origin}}/api/content/execution-environments/gitlab-ci.md

Yapir lists the repository, so its Git host connection, with its token and role, is already set up: do not ask the user to set them up. Set up the job in the repository of the working directory when it is the CI repository of the user's automations, or when the user does not know yet. Start with the minimal job these instructions give. Tell the user what agents might need that you spotted, such as a language toolchain, a database service, containers for Docker Compose or Testcontainers, or the credentials of a private package registry, and add it when they ask. Yapir runs the job from the default branch only, so the changes must reach it.

The agent runs without root privileges and does not inherit CI environment variables. Put system package installation in the job's setup commands, and the agent's tools and non-secret configuration in the mise configuration of each repository. Give it the credentials of private registries and APIs as injected credentials of the job, never as variables or files that it can read. Follow {{origin}}/api/content/execution-environments/agent-access.md for the access limits.

Existing automations keep their execution environment: the user changes it on the automation's page in Yapir.

Done when the changes are ready for the user, or the user declines.

## 6. Install the Yapir skill

Install the skill at {{origin}}/api/content/yapir-skill.md as `yapir`, where your harness loads the repository's skills, with `yapir.json` and the changes of step 5. Without a repository, install it where your harness loads the user's skills.

Done when your harness lists the skill.
