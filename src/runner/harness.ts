import type { ExecutionMessageCreateRequestDto } from "@server/lib/executions/execution-message-create.dto";
import type { ExecutionUsageDto } from "@server/lib/executions/execution-pull.dto";
import type { HarnessName } from "@server/lib/executions/harness.dto";
import type { TaskSessionUpdateRequestDto } from "@server/lib/tasks/task-session.dto";

import { claudeCodeHarness } from "./claude-code.harness";
import { codexHarness } from "./codex.harness";
import { opencodeHarness } from "./opencode.harness";
import type { Automation } from "./server";

// The harness keeps its state in HOME, which the execution environment persists for the task.
// It reaches the model and MCP through the runner's proxy, with the agent's key.
export interface HarnessInput {
  // Each harness derives its session from the task, to continue it across executions.
  taskId: string;
  model: Automation["model"];
  mcpUrl: string;
  // Yapir's instructions, then the agent's, the project's and the automation's.
  instructions: string;
  repositoryDirectories: string[];
  // Receives each prompt once the harness took it, and the parts of each agent message once the harness completed it.
  record: (
    role: ExecutionMessageCreateRequestDto["role"],
    parts: ExecutionMessageCreateRequestDto["parts"]
  ) => void;
}

export interface Harness {
  skillsDirectory: string;
  open: (input: HarnessInput) => Promise<HarnessSession>;
}

// Disposing the session stops the harness.
export interface HarnessSession extends AsyncDisposable {
  // The harness reads the text at its next step, or in a new turn when it is idle.
  send: (text: string) => void;
  // Resolves once the harness read every text sent and ended its turn.
  idle: () => Promise<void>;
  // The usage of the execution so far, including the running turn.
  usage: () => Promise<ExecutionUsageDto>;
  // The session as the harness stores it, which the harness resumes on another machine.
  export: () => Promise<Omit<TaskSessionUpdateRequestDto, "harness">>;
}

export const harnesses: Record<HarnessName, Harness> = {
  opencode: opencodeHarness,
  "claude-code": claudeCodeHarness,
  codex: codexHarness,
};
