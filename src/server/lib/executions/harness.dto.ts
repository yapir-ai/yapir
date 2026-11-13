import { z } from "zod";

export const HarnessNameSchema = z
  .enum({
    OpenCode: "opencode",
    ClaudeCode: "claude-code",
    Codex: "codex",
  })
  .describe(
    "The agent execution system that drives the model. OpenCode drives every model; Claude Code only Anthropic models, Codex only OpenAI models"
  );

export type HarnessName = z.infer<typeof HarnessNameSchema>;

const { OpenCode, ClaudeCode, Codex } = HarnessNameSchema.enum;

// OpenCode drives every model; Claude Code and Codex drive those speaking their vendor's protocol, named by its AI SDK package.
const vendorHarnesses = new Map([
  ["@ai-sdk/anthropic", [OpenCode, ClaudeCode]],
  ["@ai-sdk/openai", [OpenCode, Codex]],
]);

export const modelHarnesses = (npm: string): HarnessName[] =>
  vendorHarnesses.get(npm) ?? [OpenCode];
