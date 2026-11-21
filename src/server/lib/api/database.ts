import type { relations } from "@server/lib/db";
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { Context } from "effect";

export class Database extends Context.Service<
  Database,
  EffectPgDatabase<typeof relations>
>()("yapir/Database") {}
