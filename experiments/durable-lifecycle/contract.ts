export type TaskState = "idle" | "queued" | "running" | "blocked" | "stopped";

export type Outcome = "succeeded" | "failed" | "stopped";

export interface TaskEvent {
  id: string;
  text: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ClaimContext {
  taskId: string;
}

export type ClaimAnswer =
  | { claimed: true; context: ClaimContext }
  | { claimed: false; outcome: Outcome | null };

export type TurnAnswer =
  | { attempt: "running"; events: TaskEvent[] }
  | { attempt: Outcome };

export interface ExecutionView {
  id: string;
  outcome: Outcome | null;
  error?: string;
  stoppedBy?: string;
  usage?: Usage;
}

export interface TaskView {
  state: TaskState;
  consecutiveFailures: number;
  executions: ExecutionView[];
}

// What the lifecycle calls outside the platform. Each call can fail or be slow.
export interface Deps {
  // Starts an execution environment whose runner claims the execution. A rejection fails the execution.
  dispatch: (executionId: string) => Promise<void>;
  // Stops the execution environment. No-op when it is already gone.
  release: (executionId: string) => Promise<void>;
  // Rejects a claim from a runner outside the environment that the dispatch started.
  authenticateRunner: (
    executionId: string,
    identityToken: string
  ) => Promise<void>;
  // What the runner needs to work: read at the claim, not at the dispatch.
  claimContext: (taskId: string) => Promise<ClaimContext>;
}

// The lifecycle as its callers see it. Each variant adapts its platform to this.
// Each input resolves when the platform is quiescent: it can do nothing more
// until the time moves, an input arrives, or a pending Deps call settles.
export interface World {
  // Webhooks, schedules and user messages, already routed to their task.
  receive: (taskId: string, event: TaskEvent) => Promise<void>;
  stop: (taskId: string, userId: string) => Promise<void>;

  // The runner calls. The runner only knows its execution.
  claim: (executionId: string, identityToken: string) => Promise<ClaimAnswer>;
  pull: (executionId: string, usage?: Usage) => Promise<TurnAnswer>;
  endTurn: (executionId: string, usage?: Usage) => Promise<TurnAnswer>;
  fail: (executionId: string, error: string) => Promise<{ attempt: Outcome }>;

  // Moves the virtual time forward and fires the timers that come due.
  advance: (ms: number) => Promise<void>;
  // The process dies and starts again: only durable storage survives.
  restart: () => Promise<void>;

  // What the task page reads.
  task: (taskId: string) => Promise<TaskView>;
}

export type CreateWorld = (deps: Deps) => World | Promise<World>;

export const claimTimeout = 10 * 60_000;
export const leaseDuration = 2 * 60_000;
export const maxConsecutiveFailures = 3;

export const runnerIdentity = "runner-identity";

export function fakeOutside() {
  const dispatched: string[] = [];
  const released: string[] = [];
  let dispatchError: string | undefined;
  let held: PromiseWithResolvers<void> | undefined;

  const deps: Deps = {
    async dispatch(executionId) {
      dispatched.push(executionId);

      if (dispatchError !== undefined) {
        const error = dispatchError;
        dispatchError = undefined;
        throw new Error(error);
      }

      await held?.promise;
    },
    async release(executionId) {
      released.push(executionId);
    },
    async authenticateRunner(_executionId, identityToken) {
      if (identityToken !== runnerIdentity) {
        throw new Error("EXECUTION_CLAIM_INVALID");
      }
    },
    async claimContext(taskId) {
      return { taskId };
    },
  };

  return {
    deps,
    dispatched,
    released,
    failNextDispatch(error: string) {
      dispatchError = error;
    },
    holdDispatch() {
      held = Promise.withResolvers();
    },
    completeDispatch() {
      held?.resolve();
      held = undefined;
    },
  };
}
