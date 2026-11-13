import { z } from "zod";

// The web and the runner import this file: it must depend only on Zod.
export const TaskStateSchema = z.enum([
  "idle",
  "queued",
  "running",
  "blocked",
  "stopped",
]);

export type TaskState = z.infer<typeof TaskStateSchema>;

export const activeTaskStates = [
  "queued",
  "running",
] as const satisfies TaskState[];

export type ActiveTaskState = (typeof activeTaskStates)[number];

export type RestingTaskState = Exclude<TaskState, ActiveTaskState>;
