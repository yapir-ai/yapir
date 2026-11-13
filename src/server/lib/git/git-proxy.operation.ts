import type { ExecutionSelect, RepositorySelect } from "@server/lib/db/schema";
import type { EffectService } from "@server/lib/effects/effect.service";
import { forbidden, notFound } from "@server/lib/errors/error.factory";
import { requireRepository } from "@server/lib/tasks/task.service";
import type { TaskService } from "@server/lib/tasks/task.service";
import type { ToolContext } from "@server/lib/tools/capability-definition";

import type { GitCredential, GitHost, GitHosts } from "./git-host";

const remotePath =
  /^(?<repository>.+)\/(?<suffix>info\/refs|git-upload-pack|git-receive-pack)$/u;

interface BranchUpdate {
  branch: string;
  sha: string;
}

export function gitProxyOperation({
  taskService,
  gitHosts,
  effectService,
}: {
  taskService: TaskService;
  gitHosts: Promise<GitHosts>;
  effectService: EffectService;
}) {
  async function execute(
    request: Request,
    path: string,
    execution: ExecutionSelect
  ) {
    const remote = remotePath.exec(path)?.groups;

    if (!remote) {
      throw forbidden("GIT_OPERATION_FORBIDDEN");
    }

    const { suffix } = remote;

    const context = {
      ...(await taskService.load(execution.taskId)),
      execution,
    };

    const { automation } = context;
    const repository = requireRepository(context, remote.repository!);
    const gitHost = (await gitHosts).get(repository.provider);

    if (!gitHost) {
      throw notFound("GIT_HOST_NOT_FOUND");
    }

    const url = new URL(request.url);
    const service = url.searchParams.get("service");

    const read =
      (request.method === "GET" &&
        suffix === "info/refs" &&
        service === "git-upload-pack") ||
      (request.method === "POST" && suffix === "git-upload-pack");

    const write =
      automation.capabilities.some(
        ({ name }) => name === gitHost.pushCapability
      ) &&
      ((request.method === "GET" &&
        suffix === "info/refs" &&
        service === "git-receive-pack") ||
        (request.method === "POST" && suffix === "git-receive-pack"));

    if (!(read || write)) {
      throw forbidden("GIT_OPERATION_FORBIDDEN");
    }

    const updates =
      write && request.method === "POST" ? await authorizePush(request) : [];

    const response = await forwardGit(
      request,
      `https://${repository.host}/${repository.path}.git/${suffix}${url.search}`,
      await gitHost.credential()
    );

    if (response.ok) {
      await recordPushes(gitHost, repository, updates, context);
    }

    return response;
  }

  // Git reports a rejected ref in the response body: a refused push is still recorded.
  async function recordPushes(
    gitHost: GitHost,
    repository: RepositorySelect,
    updates: BranchUpdate[],
    context: ToolContext
  ) {
    for (const { branch, sha } of updates) {
      const { reference, url } = gitHost.pushedCommit(repository, sha);
      await effectService.record(
        reference,
        { label: branch, title: sha.slice(0, 7), url },
        context
      );
    }
  }

  return { execute };
}

// A push may only update Yapir branches.
async function authorizePush(request: Request) {
  if (request.headers.has("content-encoding")) {
    throw forbidden("GIT_PUSH_FORBIDDEN");
  }

  const updates = await yapirBranchUpdates(
    // SAFETY: HTTP bodies yield bytes; Cloudflare's generated body type uses any.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    request.clone().body! as ReadableStream<Uint8Array>
  );

  if (!updates) {
    throw forbidden("GIT_PUSH_FORBIDDEN");
  }

  return updates;
}

async function forwardGit(
  request: Request,
  upstreamUrl: string,
  { username, password }: GitCredential
) {
  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-encoding",
    "git-protocol",
    "accept",
  ]) {
    const value = request.headers.get(name);

    if (value !== null) {
      headers.set(name, value);
    }
  }

  headers.set("authorization", `Basic ${btoa(`${username}:${password}`)}`);

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw forbidden("GIT_UPSTREAM_REDIRECT");
  }

  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType !== null) {
    responseHeaders.set("content-type", contentType);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

// The ref updates of a push, or null when it targets anything but Yapir branches.
async function yapirBranchUpdates(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const packet = new Uint8Array(65_520);
  let filled = 0;
  let length = 4;
  let total = 0;
  let commands = 0;
  const updates: BranchUpdate[] = [];

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        return null;
      }

      let offset = 0;

      while (offset < value.length) {
        // Copy only the current header or command, never the pack after the flush.
        const count = Math.min(length - filled, value.length - offset);
        total += count;

        if (total > 1_048_576) {
          return null;
        }

        packet.set(value.subarray(offset, offset + count), filled);
        filled += count;
        offset += count;

        if (filled < length) {
          continue;
        }

        if (length === 4) {
          const header = decoder.decode(packet.subarray(0, 4));

          if (!/^[0-9a-f]{4}$/u.test(header)) {
            return null;
          }

          length = Number.parseInt(header, 16);

          if (length === 0) {
            return commands > 0 ? updates : null;
          }

          if (length <= 4 || length > packet.length) {
            return null;
          }

          continue;
        }

        const command =
          /^[0-9a-f]+ (?<sha>[0-9a-f]+) refs\/heads\/(?<branch>yapir\/[^\0\n ]+)(?:\0[^\n]*)?\n?$/u.exec(
            decoder.decode(packet.subarray(4, length))
          );

        if (!command?.groups) {
          return null;
        }

        commands += 1;
        const { sha, branch } = command.groups;

        // A deletion pushes no commit.
        if (!/^0+$/u.test(sha!)) {
          updates.push({ branch: branch!, sha: sha! });
        }

        filled = 0;
        length = 4;
      }
    }
  } finally {
    // One tee's cancellation waits for the other branch: forwarding has not started yet.
    void reader.cancel();
  }
}
