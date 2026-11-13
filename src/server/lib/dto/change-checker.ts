import type { z } from "zod";

// An Update request: each field it carries, a JSON value, changes the resource.
type UpdateRequest = Readonly<Partial<Record<string, z.core.util.JSONType>>>;

export const hasAnyChange = (request: UpdateRequest) =>
  Object.values(request).some((value) => value !== undefined);
