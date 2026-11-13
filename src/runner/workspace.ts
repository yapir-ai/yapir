import { homedir } from "node:os";
import path from "node:path";

import { $ } from "bun";

import type { Automation, Project } from "./server";

export const workspaceDirectory = "/workspace";

export const repositoryDirectory = (
  repository: Project["repositories"][number]
) => path.join(workspaceDirectory, repository.path);

export async function prepareRepositories(
  { repositories }: Project,
  cloneUrl: (repositoryPath: string) => string,
  commitIdentity: Automation["commitIdentity"]
) {
  // The commit identity attributes the automation's pushes to it.
  // Git prefers the environment to any configuration, including the agent's.
  Object.assign(process.env, {
    GIT_AUTHOR_NAME: commitIdentity.name,
    GIT_AUTHOR_EMAIL: commitIdentity.email,
    GIT_COMMITTER_NAME: commitIdentity.name,
    GIT_COMMITTER_EMAIL: commitIdentity.email,
  });
  await Promise.all(
    repositories.map(async (repository) => {
      await $`git clone -- ${cloneUrl(repository.path)} ${repositoryDirectory(repository)}`.quiet();
    })
  );
}

// The shims select the tool versions of the repository in which a command runs.
export async function prepareToolchain({ repositories }: Project) {
  for (const repository of repositories) {
    await $`mise install`.cwd(repositoryDirectory(repository)).quiet();
  }

  process.env.PATH = `${path.join(homedir(), ".local/share/mise/shims")}:${process.env.PATH}`;
}

export async function prepareSkills(
  skills: Automation["skills"],
  skillsDirectory: string
) {
  await Promise.all(
    skills.map(async ({ name, description, instructions }) => {
      const frontmatter = Bun.YAML.stringify({ name, description }, null, 2);

      await Bun.write(
        path.join(workspaceDirectory, skillsDirectory, name, "SKILL.md"),
        `---\n${frontmatter}\n---\n\n${instructions}\n`
      );
    })
  );
}
