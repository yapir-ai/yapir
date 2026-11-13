import type { ExecutionMessageSelect } from "@server/lib/db/schema";

export function toResponseDto({
  id,
  executionId,
  message,
  createdAt,
}: ExecutionMessageSelect) {
  // An AI SDK UI message. Its recursive JSON type is too deep for the web's typed collections.
  const uiMessage: unknown = message;

  return {
    id,
    executionId,
    message: uiMessage,
    createdAt: createdAt.toISOString(),
  };
}
