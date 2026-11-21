import { HttpApiMiddleware } from "effect/http-api";

import type { Database } from "./database";

export class DatabaseAccess extends HttpApiMiddleware.Service<
  DatabaseAccess,
  { provides: Database }
>()("yapir/DatabaseAccess") {}
