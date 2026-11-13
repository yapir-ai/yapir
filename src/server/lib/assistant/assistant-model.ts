import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Db } from "@server/lib/db";
import { conflict } from "@server/lib/errors/error.factory";
import { findAssistantPackage } from "@server/lib/provider-catalog/provider-catalog-list.operation";
import type { ProviderCatalogListOperation } from "@server/lib/provider-catalog/provider-catalog-list.operation";
import { wrapLanguageModel } from "ai";
import type { LanguageModelCallOptions, LanguageModelMiddleware } from "ai";

// The AI SDK provider factories through which the Assistant drives a model, by models.dev `npm` package.
const assistantProviders = {
  "@ai-sdk/anthropic": createAnthropic,
  "@ai-sdk/openai": createOpenAI,
  "@ai-sdk/openai-compatible": createOpenAICompatible,
  "@openrouter/ai-sdk-provider": createOpenRouter,
};

interface AssistantRequestContext {
  conversationId: string;
}

// OpenCode refuses requests without a session ID, which also routes and caches the conversation's requests.
const opencodeSession = ({
  conversationId,
}: AssistantRequestContext): LanguageModelMiddleware => ({
  specificationVersion: "v4",
  // oxlint-disable-next-line eslint/require-await The middleware contract returns a promise.
  transformParams: async ({ params }) => ({
    ...params,
    headers: { ...params.headers, "x-opencode-session": conversationId },
  }),
});

// The OpenRouter SDK ignores the standard reasoning option, and reads the effort from its provider options.
const openrouterEffort = (): LanguageModelMiddleware => ({
  specificationVersion: "v4",
  // oxlint-disable-next-line eslint/require-await The middleware contract returns a promise.
  transformParams: async ({ params }) =>
    params.reasoning
      ? {
          ...params,
          providerOptions: {
            ...params.providerOptions,
            openrouter: {
              ...params.providerOptions?.openrouter,
              reasoning: { effort: params.reasoning },
            },
          },
        }
      : params,
});

// The request quirks of a catalog provider, by models.dev provider ID.
const assistantProviderMiddlewares = new Map([
  ["opencode", opencodeSession],
  ["opencode-go", opencodeSession],
  ["openrouter", openrouterEffort],
]);

export function assistantModel({
  db,
  providerCatalogListOperation,
}: {
  db: Db;
  providerCatalogListOperation: ProviderCatalogListOperation;
}) {
  async function load(conversationId: string) {
    const defaults = await db.query.defaultsTable.findFirst({
      with: { modelProvider: true },
    });

    if (!defaults) {
      throw conflict("DEFAULTS_NOT_CONFIGURED");
    }

    const { modelProvider, model, effort } = defaults;

    const npm = await findAssistantPackage(providerCatalogListOperation, {
      catalogId: modelProvider.catalogId,
      model,
    });

    // The catalog can change after the defaults.
    if (!npm) {
      throw conflict("ASSISTANT_MODEL_UNSUPPORTED");
    }

    const languageModel = assistantProviders[npm]({
      name: modelProvider.catalogId,
      baseURL: modelProvider.baseUrl,
      apiKey: modelProvider.apiKey,
    })(model);

    const middleware = assistantProviderMiddlewares.get(
      modelProvider.catalogId
    );

    return {
      model: middleware
        ? wrapLanguageModel({
            model: languageModel,
            middleware: middleware({ conversationId }),
          })
        : languageModel,
      // SAFETY: the provider validates the effort, a free value.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      reasoning: (effort ?? undefined) as LanguageModelCallOptions["reasoning"],
    };
  }

  return { load };
}

export type AssistantModel = ReturnType<typeof assistantModel>;

export type AssistantCallSettings = Awaited<ReturnType<AssistantModel["load"]>>;
