import type { Clock } from "@server/lib/clock/clock";
import {
  HarnessNameSchema,
  modelHarnesses,
} from "@server/lib/executions/harness.dto";
import { z } from "zod";

// The registry OpenCode uses: its provider and model IDs are the ones harnesses know.
const registryUrl = "https://models.dev/api.json";
const registryTtlSeconds = 3600;

const Registry = z.record(
  z.string(),
  z.object({
    id: z.string(),
    name: z.string(),
    api: z.string().optional(),
    npm: z.string(),
    models: z.record(
      z.string(),
      z.object({
        id: z.string(),
        name: z.string(),
        // A model can speak another protocol than its provider's.
        provider: z
          .object({ npm: z.string().optional(), api: z.string().optional() })
          .optional(),
        // Among the ways to control reasoning, the named effort levels.
        reasoning_options: z
          .array(
            z.object({
              type: z.string(),
              // Some models list null, which names no level.
              values: z.array(z.string().nullable()).optional(),
            })
          )
          .optional(),
        // USD per million tokens.
        cost: z
          .object({
            input: z.number(),
            output: z.number(),
            cache_read: z.number().default(0),
            cache_write: z.number().default(0),
          })
          .optional(),
      })
    ),
  })
);

// Providers whose SDK holds the base URL, which models.dev then omits.
const sdkBaseUrls = new Map([
  ["anthropic", "https://api.anthropic.com/v1"],
  ["openai", "https://api.openai.com/v1"],
  ["google", "https://generativelanguage.googleapis.com/v1beta"],
  ["mistral", "https://api.mistral.ai/v1"],
  ["groq", "https://api.groq.com/openai/v1"],
  ["xai", "https://api.x.ai/v1"],
]);

const assistantPackages = [
  "@ai-sdk/anthropic",
  "@ai-sdk/openai",
  "@ai-sdk/openai-compatible",
  "@openrouter/ai-sdk-provider",
] as const;

type AssistantPackage = (typeof assistantPackages)[number];

const isAssistantPackage = (npm: string): npm is AssistantPackage =>
  assistantPackages.some((assistantPackage) => assistantPackage === npm);

let cached: { catalog: ProviderCatalog; expiresAt: number } | undefined;

export function providerCatalogListOperation({ clock }: { clock: Clock }) {
  async function execute() {
    const now = clock.now.getTime();

    if (!cached || cached.expiresAt < now) {
      cached = {
        catalog: await fetchCatalog(),
        expiresAt: now + registryTtlSeconds * 1000,
      };
    }

    return cached.catalog;
  }

  return { execute };
}

async function fetchCatalog() {
  const response = await fetch(registryUrl, {
    cf: { cacheTtl: registryTtlSeconds },
  });

  const registry = Registry.parse(await response.json());

  return Object.values(registry).map((provider) => ({
    id: provider.id,
    name: provider.name,
    npm: provider.npm,
    baseUrl: provider.api ?? sdkBaseUrls.get(provider.id) ?? null,
    // The Assistant drives a model out of the catalog as its provider's.
    assistant: isAssistantPackage(provider.npm),
    models: Object.values(provider.models).map((model) => {
      // The AI SDK package speaking the model's protocol.
      const npm = model.provider?.npm ?? provider.npm;
      const baseUrl = model.provider?.api ?? null;
      // A model served at another endpoint is out of the model provider's base URL.
      const outOfBaseUrl = baseUrl !== null && baseUrl !== provider.api;

      return {
        id: model.id,
        name: model.name,
        baseUrl,
        npm,
        efforts:
          model.reasoning_options
            ?.find(({ type }) => type === "effort")
            ?.values?.filter((value) => value !== null) ?? [],
        harnesses: outOfBaseUrl
          ? [HarnessNameSchema.enum.OpenCode]
          : modelHarnesses(npm),
        // The Assistant drives a model at the model provider's base URL.
        assistant: !outOfBaseUrl && isAssistantPackage(npm),
        cost: model.cost ?? null,
      };
    }),
  }));
}

// The AI SDK package through which the Assistant drives a model of a model provider, if it can.
export async function findAssistantPackage(
  catalogOperation: ProviderCatalogListOperation,
  { catalogId, model }: { catalogId: string; model: string }
) {
  const provider = (await catalogOperation.execute()).find(
    ({ id }) => id === catalogId
  );

  const entry = provider?.models.find(({ id }) => id === model) ?? provider;

  return entry?.assistant && isAssistantPackage(entry.npm)
    ? entry.npm
    : undefined;
}

type ProviderCatalog = Awaited<ReturnType<typeof fetchCatalog>>;

export type ProviderCatalogListOperation = ReturnType<
  typeof providerCatalogListOperation
>;
