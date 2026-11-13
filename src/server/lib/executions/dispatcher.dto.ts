import { z } from "zod";

export const DispatcherNameSchema = z
  .enum(["local", "github-actions", "gitlab-ci"])
  .describe("The execution environment, from the dispatcher list");

export type DispatcherName = z.infer<typeof DispatcherNameSchema>;
