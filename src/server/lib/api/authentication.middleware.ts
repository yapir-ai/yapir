import { HttpApiMiddleware } from "effect/http-api";

import { Unauthenticated } from "./api-error";
import type { CurrentUser } from "./current-user";

export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentUser }
>()("yapir/Authentication", { error: Unauthenticated }) {}
