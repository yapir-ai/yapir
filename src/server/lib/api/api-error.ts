import { ErrorCodes } from "@server/lib/errors/error.factory";
import type { ErrorCode } from "@server/lib/errors/error.factory";
import { Effect, Schema } from "effect";

export function apiError<
  const Code extends ErrorCode,
  const Status extends number,
>(code: Code, status: Status) {
  // oxlint-disable-next-line unicorn/throw-new-error Schema.Error is a class factory, not a constructor.
  class ApiError extends Schema.Error<ApiError>(code)(
    {
      title: Schema.tag(code),
      status: Schema.tag(status),
      detail: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed<string>(ErrorCodes[code]))
      ),
    },
    { httpApiStatus: status }
  ) {}

  return ApiError;
}

export const Unauthenticated = apiError("UNAUTHENTICATED", 401);
