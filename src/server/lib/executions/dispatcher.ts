import type { ExecutionSelect, RepositorySelect } from "@server/lib/db/schema";
import { badRequest } from "@server/lib/errors/error.factory";
import type { RepositoryProvider } from "@server/lib/git/repository-provider";

import type { DispatchPayloadDto } from "./dispatch-payload.dto";
import type { DispatcherName } from "./dispatcher.dto";

type CiRepository = Pick<RepositorySelect, "path"> | null;

export interface QueuedExecution {
  dispatcher: DispatcherName;
  ciRepository: CiRepository;
  payload: DispatchPayloadDto;
}

export interface Dispatcher {
  name: DispatcherName;
  label: string;
  gitHost?: RepositoryProvider;
  dispatch: (execution: QueuedExecution) => Promise<void>;
  // Rejects a claim from a runner outside the environment that this dispatcher starts.
  authenticate: (
    identityToken: string | undefined,
    ciRepository: CiRepository
  ) => Promise<void>;
  // Stops the execution environment. No-op when it is already gone.
  release: (execution: Pick<ExecutionSelect, "id">) => Promise<void>;
}

// Only enabled dispatchers: an execution's dispatcher can be missing once its configuration is removed.
export type Dispatchers = ReadonlyMap<DispatcherName, Dispatcher>;

export function executionEnvironment(
  dispatchers: Pick<Dispatcher, "name" | "gitHost">[],
  project: {
    ciRepositoryId: string | null;
    repositories: { id: string; provider: RepositoryProvider }[];
  },
  requested: { dispatcher?: DispatcherName; ciRepositoryId?: string }
) {
  const ciRepositoryId = requested.ciRepositoryId ?? project.ciRepositoryId;

  const ciRepository = project.repositories.find(
    ({ id }) => id === ciRepositoryId
  );

  const dispatcher =
    requested.dispatcher ??
    dispatchers.find(
      ({ gitHost }) =>
        gitHost !== undefined && gitHost === ciRepository?.provider
    )?.name;

  if (!dispatcher) {
    throw badRequest("CI_REPOSITORY_INVALID");
  }

  return { dispatcher, ciRepositoryId };
}
