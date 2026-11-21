import type { AppType } from "@server";
import { YapirApi } from "@server/lib/api/api";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { hc } from "hono/client";

export const client = hc<AppType>("");

class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof YapirApi>
>()("yapir/ApiClient") {}

const runtime = ManagedRuntime.make(
  Layer.effect(ApiClient)(
    HttpApiClient.make(YapirApi, { baseUrl: window.location.origin })
  ).pipe(Layer.provide(FetchHttpClient.layer))
);

export const api = async <A, E>(
  call: (client: ApiClient["Service"]) => Effect.Effect<A, E>,
  options?: { signal?: AbortSignal }
) =>
  await runtime.runPromise(
    Effect.flatMap(Effect.service(ApiClient), call),
    options
  );
