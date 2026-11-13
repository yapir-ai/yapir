import type { RepositorySelect } from "@server/lib/db/schema";
import type {
  ResourceReference,
  TriggerEventDefinition,
} from "@server/lib/events/event-definition";
import type { EventProcessOperation } from "@server/lib/events/event-process.operation";
import type { Dispatcher } from "@server/lib/executions/dispatcher";
import type { CapabilityDefinition } from "@server/lib/tools/capability-definition";

import type { RepositoryProvider } from "./repository-provider";

export interface GitCredential {
  username: string;
  password: string;
}

export interface GitHost {
  provider: RepositoryProvider;
  events: TriggerEventDefinition[];
  capabilities: CapabilityDefinition[];
  dispatchers: Dispatcher[];
  // Grants Git push access through the proxy.
  pushCapability: string;
  credential: () => GitCredential | Promise<GitCredential>;
  pushedCommit: (
    repository: Pick<RepositorySelect, "host" | "path">,
    sha: string
  ) => { reference: ResourceReference; url: string };
  // Verifies and handles a delivery to the host's webhook. Event processing depends on
  // the Git hosts' events: it is resolved per delivery.
  receiveWebhook: (
    request: Request,
    services: { eventProcessOperation: EventProcessOperation }
  ) => Promise<void>;
}

export type GitHosts = ReadonlyMap<RepositoryProvider, GitHost>;

export function gitHostEntries<T>(
  gitHosts: GitHosts,
  entries: (gitHost: GitHost) => T[]
) {
  return [...gitHosts.values()].flatMap((gitHost) =>
    entries(gitHost).map((entry) => ({ ...entry, gitHost: gitHost.provider }))
  );
}
