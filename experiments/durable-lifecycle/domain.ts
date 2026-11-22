export type TaskState = "idle" | "queued" | "running" | "blocked" | "stopped";

export type RestingTaskState = Extract<
  TaskState,
  "idle" | "blocked" | "stopped"
>;

export interface TaskEvent {
  id: string;
  text: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export type End =
  | { outcome: "succeeded" }
  | { outcome: "failed"; error: string }
  | { outcome: "stopped"; stoppedBy: string };

export const claimTimeout = 10 * 60_000;
export const leaseDuration = 2 * 60_000;
export const maxConsecutiveFailures = 3;
