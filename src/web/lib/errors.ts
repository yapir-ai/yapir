import type { Transaction } from "@tanstack/react-db";
import { DetailedError } from "hono/client";
import { toast } from "sonner";
import { z } from "zod";

const FailedRequest = z.object({ data: z.object({ detail: z.string() }) });

export function errorDetail(error: Error) {
  const request = FailedRequest.safeParse(
    error instanceof DetailedError ? error.detail : undefined
  );

  return request.success ? request.data.data.detail : error.message;
}

export function toastError(error: Error) {
  toast.error(errorDetail(error));
}

export async function toastFailure<T extends object>(
  transaction: Transaction<T>
) {
  await transaction.when("settled").catch(toastError);
}
