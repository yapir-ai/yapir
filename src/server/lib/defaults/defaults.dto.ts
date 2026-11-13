import type { DefaultsSelect } from "@server/lib/db/schema";

export const toResponseDto = (defaults: DefaultsSelect | undefined) => ({
  modelProviderId: defaults?.modelProviderId ?? null,
  model: defaults?.model ?? null,
  effort: defaults?.effort ?? null,
  harness: defaults?.harness ?? null,
});
