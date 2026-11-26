import type { AppType } from "@server";
import type { DispatchPayloadDto } from "@server/lib/executions/dispatch-payload.dto";
import type { ExecutionFailRequestDto } from "@server/lib/executions/execution-fail.dto";
import {
  leaseDuration,
  pullInterval,
} from "@server/lib/executions/execution-lease";
import type { ExecutionMessageCreateRequestDto } from "@server/lib/executions/execution-message-create.dto";
import type { ExecutionPullRequestDto } from "@server/lib/executions/execution-pull.dto";
import type { ExecutionOutcome } from "@server/lib/executions/execution.dto";
import type { HarnessName } from "@server/lib/executions/harness.dto";
import { agentPath, runnerPath } from "@server/lib/executions/runner-path";
import type { TaskSessionUpdateRequestDto } from "@server/lib/tasks/task-session.dto";
import { $ } from "bun";
import { DetailedError, hc, parseResponse } from "hono/client";
import { v7 as uuidv7 } from "uuid";

export async function claim(
  { serverUrl, executionId, claimId }: DispatchPayloadDto,
  identityToken: string | undefined
) {
  const { api } = hc<AppType>(serverUrl);

  return await parseResponse(
    api.runner.claim.$post({ json: { executionId, claimId, identityToken } })
  );
}

type Claimed = Extract<Awaited<ReturnType<typeof claim>>, { claimed: true }>;

export type Automation = Claimed["automation"];

export type Project = Claimed["project"];

export function executionClient(serverUrl: string, token: string) {
  const headers = { authorization: `Bearer ${token}` };
  const { api } = hc<AppType>(serverUrl, { headers });
  let outcome: ExecutionOutcome | undefined;

  async function settle<
    Answer extends { attempt: ExecutionOutcome | "running" },
  >(response: Promise<Answer>) {
    const answer = await response;

    if (answer.attempt !== "running") {
      outcome = answer.attempt;
    }

    return answer;
  }

  const pull = async (request: ExecutionPullRequestDto) =>
    await settle(
      whileLeaseHolds(
        async () =>
          await parseResponse(api.runner.pull.$post({ json: request }))
      )
    );

  const turnEnd = async (request: ExecutionPullRequestDto) =>
    await settle(
      parseResponse(api.runner["turn-end"].$post({ json: request }))
    );

  let failing: Promise<unknown> | undefined;

  // The first failure is the execution's: the agent reports its error before it exits.
  async function fail(request: ExecutionFailRequestDto) {
    failing ??= settle(parseResponse(api.runner.fail.$post({ json: request })));
    await failing;
  }

  return {
    pull,
    turnEnd,
    fail,
    get outcome() {
      return outcome;
    },
  };
}

async function whileLeaseHolds<Answer>(pull: () => Promise<Answer>) {
  const leaseEnd = Date.now() + leaseDuration;

  for (;;) {
    try {
      return await pull();
    } catch (error) {
      const serverFailed =
        error instanceof DetailedError && error.statusCode >= 500;

      if (!serverFailed || Date.now() >= leaseEnd) {
        throw error;
      }

      await Bun.sleep(pullInterval);
    }
  }
}

export function agentClient(proxyUrl: string) {
  const { api } = hc<AppType>(proxyUrl);
  const sending: Promise<void>[] = [];

  // The transcript and the session copy are best effort: their failure leaves the work unchanged.
  function send(description: string, request: () => Promise<void>) {
    sending.push(
      (async () => {
        try {
          await request();
        } catch (error) {
          console.error(`${description} not recorded`, error);
        }
      })()
    );
  }

  function record(
    role: ExecutionMessageCreateRequestDto["role"],
    parts: ExecutionMessageCreateRequestDto["parts"]
  ) {
    send("Transcript message", async () => {
      await parseResponse(
        api.runner.messages.$post({ json: { id: uuidv7(), role, parts } })
      );
    });
  }

  function saveSession(
    harness: HarnessName,
    session: () => Promise<Omit<TaskSessionUpdateRequestDto, "harness">>
  ) {
    send("Session", async () => {
      await parseResponse(
        api.runner.session.$post({ json: { harness, ...(await session()) } })
      );
    });
  }

  // The end of the execution revokes its token: the requests on their way go first.
  async function flushed<Answer>(request: () => Promise<Answer>) {
    await Promise.all(sending.splice(0));

    return await request();
  }

  const pull = async (request: ExecutionPullRequestDto) =>
    await flushed(
      async () => await parseResponse(api.runner.pull.$post({ json: request }))
    );

  const turnEnd = async (request: ExecutionPullRequestDto) =>
    await flushed(
      async () =>
        await parseResponse(api.runner["turn-end"].$post({ json: request }))
    );

  async function fail(request: ExecutionFailRequestDto) {
    await parseResponse(api.runner.fail.$post({ json: request }));
  }

  return {
    pull,
    turnEnd,
    fail,
    record,
    saveSession,
    // Git appends its own paths to the clone URL of each repository.
    cloneUrl: (repositoryPath: string) =>
      new URL(`${runnerPath}${agentPath.git}/${repositoryPath}`, proxyUrl).href,
    mcpUrl: api.runner.mcp.$url().href,
  };
}

// A command's error output tells more than its exit code.
export function failure(cause: unknown): ExecutionFailRequestDto {
  if (cause instanceof $.ShellError) {
    return { error: cause.stderr.toString().trim() };
  }

  return { error: cause instanceof Error ? cause.message : String(cause) };
}
