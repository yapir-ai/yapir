import { pullInterval } from "@server/lib/executions/execution-lease";
import type { HarnessName } from "@server/lib/executions/harness.dto";
import { Data, Effect } from "effect";

import type { HarnessSession } from "./harness";
import type { agentClient } from "./server";

// The agent passes the events on to the harness as they are.
type Events = unknown[];

class ExecutionEnded extends Data.TaggedError("ExecutionEnded") {}

export const runTurns = Effect.fnUntraced(
  function* runTurns({
    server,
    harness,
    open,
  }: {
    server: Pick<
      ReturnType<typeof agentClient>,
      "pull" | "turnEnd" | "saveSession"
    >;
    harness: HarnessName;
    open: () => Promise<HarnessSession>;
  }) {
    // The server marks the events of a pull as delivered: a pull that started hands them over, even when the work ended first.
    const pull = Effect.fnUntraced(function* pull(
      receive: (events: Events) => void,
      usage?: HarnessSession["usage"]
    ) {
      const answer = yield* Effect.promise(
        async () => await server.pull({ usage: await usage?.() })
      );

      if (answer.attempt !== "running") {
        return yield* new ExecutionEnded();
      }

      if (answer.events.length > 0) {
        receive(answer.events);
      }
    }, Effect.uninterruptible);

    const pullDuring = <Result, Requirements>(
      work: Effect.Effect<Result, never, Requirements>,
      receive: (events: Events) => void,
      usage?: HarnessSession["usage"]
    ) =>
      Effect.raceFirst(
        work,
        Effect.sleep(pullInterval).pipe(
          Effect.andThen(pull(receive, usage)),
          Effect.forever
        )
      );

    const received: Events = [];

    // The scope stops a harness that opened after the execution ended.
    const session = yield* pullDuring(
      Effect.acquireRelease(Effect.promise(open), (opened) =>
        Effect.promise(() => opened[Symbol.asyncDispose]())
      ),
      (events) => {
        received.push(...events);
      }
    );

    const send = (events: Events) => {
      session.send(JSON.stringify({ events }));
    };

    let events = received;

    for (;;) {
      if (events.length === 0) {
        const answer = yield* Effect.promise(
          async () => await server.turnEnd({ usage: await session.usage() })
        );

        if (answer.attempt !== "running") {
          return;
        }

        ({ events } = answer);
      }

      send(events);
      yield* pullDuring(Effect.promise(session.idle), send, session.usage);
      server.saveSession(harness, session.export);
      events = [];
    }
  },
  Effect.scoped,
  Effect.catchTag("ExecutionEnded", () => Effect.void)
);
