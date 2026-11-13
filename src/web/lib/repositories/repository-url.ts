import type { Repository } from "./repository.collection";

export function repositoryUrl({
  host,
  path,
}: Pick<Repository, "host" | "path">) {
  return new URL(path, `https://${host}`).href;
}
