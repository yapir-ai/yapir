import type { CurrentUser as CurrentUserResolver } from "@server/lib/auth/current-user";
import { Context } from "effect";

export class CurrentUser extends Context.Service<
  CurrentUser,
  Awaited<ReturnType<CurrentUserResolver["get"]>>
>()("yapir/CurrentUser") {}
