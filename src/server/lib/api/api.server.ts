import { PgClient } from "@effect/sql-pg";
import { AppClock } from "@server/lib/clock/clock";
import type { Clock } from "@server/lib/clock/clock";
import { relations } from "@server/lib/db";
import { apiPath } from "@server/lib/executions/runner-path";
import type { HonoEnv } from "@server/lib/hono/hono.factory";
import { SkillsHandlers } from "@server/lib/skills/skill.handlers";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder, OpenApi } from "effect/http-api";
import type { Context as HonoContext } from "hono";

import { YapirApi } from "./api";
import { Unauthenticated } from "./api-error";
import { Authentication } from "./authentication.middleware";
import { CurrentUser } from "./current-user";
import { Database } from "./database";
import { DatabaseAccess } from "./database-access.middleware";

const AuthenticationLive = Layer.succeed(Authentication)(
  Effect.fnUntraced(function* AuthenticationLive(httpEffect) {
    const user = Context.getOrUndefined(yield* Effect.context(), CurrentUser);

    if (!user) {
      return yield* new Unauthenticated();
    }

    return yield* Effect.provideService(httpEffect, CurrentUser, user);
  })
);

const databaseLayer = (databaseUrl: string) =>
  Layer.effect(Database)(makeWithDefaults({ relations })).pipe(
    Layer.provide(PgClient.layer({ url: Redacted.make(databaseUrl) })),
    Layer.orDie
  );

const DatabaseAccessLive = (databaseUrl: string) =>
  Layer.succeed(DatabaseAccess)((httpEffect) =>
    Effect.provide(httpEffect, databaseLayer(databaseUrl))
  );

export function createApi({
  clock,
  databaseUrl,
}: {
  clock: Clock;
  databaseUrl: string;
}) {
  const { handler } = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(YapirApi).pipe(
      Layer.provide(SkillsHandlers),
      Layer.provide([
        AuthenticationLive,
        DatabaseAccessLive(databaseUrl),
        Layer.succeed(AppClock)(clock),
      ]),
      Layer.provide(HttpServer.layerServices)
    )
  );

  async function handle(c: HonoContext<HonoEnv>) {
    const user = await c.var.container.currentUser.get();

    return await handler(c.req.raw, Context.make(CurrentUser, user));
  }

  const { paths, components } = OpenApi.fromApi(YapirApi);

  const openApi = {
    paths: Object.fromEntries(
      Object.entries(paths).map(([path, item]) => [
        path.slice(apiPath.length),
        item,
      ])
    ),
    components,
  };

  return { handle, openApi };
}

export type Api = ReturnType<typeof createApi>;
