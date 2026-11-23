import { z } from "zod";

// The web imports this file: it must depend only on Zod.
export const TaskEventStateSchema = z.enum([
  "pending",
  "delivered",
  "acknowledged",
]);

export type TaskEventState = z.infer<typeof TaskEventStateSchema>;
