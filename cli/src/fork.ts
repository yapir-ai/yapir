import { mkdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

import type { Command } from "commander";

import type { Instance } from "./config.ts";
import { request } from "./request.ts";

interface TaskSession {
  harness: "claude-code" | "codex" | "opencode";
  sessionId: string;
  content: string;
}

const restore = {
  // Claude Code keeps the sessions of a directory in a folder named after its path, each other character replaced.
  async "claude-code"({ sessionId, content }: TaskSession) {
    const directory = path.join(
      homedir(),
      ".claude/projects",
      process.cwd().replaceAll(/[^a-zA-Z0-9]/gu, "-")
    );

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${sessionId}.jsonl`), content);

    return `claude --resume ${sessionId}`;
  },
  // Codex keeps each thread in a rollout file named after its ID, in a folder of its start date.
  async codex({ sessionId, content }: TaskSession) {
    const now = new Date().toISOString();

    const directory = path.join(
      homedir(),
      ".codex/sessions",
      ...now.slice(0, 10).split("-")
    );

    const time = now.slice(0, 19).replaceAll(":", "-");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, `rollout-${time}-${sessionId}.jsonl`),
      content
    );

    return `codex resume ${sessionId}`;
  },
  // OpenCode keeps its sessions in a database: it imports the exported session.
  async opencode({ sessionId, content }: TaskSession) {
    // SAFETY: the content is OpenCode's session export.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const exported = JSON.parse(content) as { info: { agent?: string } };
    // Yapir's agent exists only in Yapir's environment: without it, OpenCode uses its default agent.
    delete exported.info.agent;
    const file = path.join(tmpdir(), `${sessionId}.json`);
    await writeFile(file, JSON.stringify(exported));

    return `opencode session import ${file} --directory . && opencode --session ${sessionId}`;
  },
};

export function addForkCommand(program: Command, { url, key }: Instance) {
  program.commands
    .find((command) => command.name() === "task")!
    .command("fork")
    .description(
      "Put the task's harness session on this machine, for this directory, and print the command that continues it with your harness"
    )
    .argument("<taskId>", "Task ID")
    .action(async (taskId: string) => {
      const response = await request(
        new URL(`/api/tasks/${encodeURIComponent(taskId)}/session`, url),
        key
      );

      if (!response) {
        return;
      }

      // SAFETY: the instance's taskSessionInfo operation returns a task session.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const session = (await response.json()) as TaskSession;
      console.log(await restore[session.harness](session));
    });
}
