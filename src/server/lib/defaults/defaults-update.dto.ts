import { HarnessNameSchema } from "@server/lib/executions/harness.dto";
import {
  EffortSchema,
  ModelSchema,
} from "@server/lib/model-providers/model-provider.dto";
import { z } from "zod";

export const DefaultsUpdateRequest = z
  .strictObject({
    modelProviderId: z
      .uuid()
      .describe(
        "The model provider of the default model, with which the Assistant answers and new agents start"
      ),
    model: ModelSchema.describe(
      "The default model's ID, which the Assistant must be able to drive. A model absent from the provider catalog uses the AI SDK package of its model provider"
    ),
    effort: EffortSchema,
    harness: HarnessNameSchema.describe("The harness new agents start with"),
  })
  .partial();

export type DefaultsUpdateRequestDto = z.infer<typeof DefaultsUpdateRequest>;
