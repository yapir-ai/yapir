import { DispatcherNameSchema } from "@server/lib/executions/dispatcher.dto";
import { Effect, Layer, ManagedRuntime, Schema } from "effect";
import type { WorkflowEngine } from "effect/workflow";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import type { QueuedAttempt } from "./machine/attempt";

const Attempt = Workflow.make("Attempt", {
  payload: {
    id: Schema.String,
    taskId: Schema.String,
    dispatcher: Schema.Literals(DispatcherNameSchema.options),
    ciRepository: Schema.NullOr(Schema.Struct({ path: Schema.String })),
    payload: Schema.Struct({
      executionId: Schema.String,
      claimId: Schema.String,
      cacheKey: Schema.String,
      serverUrl: Schema.String,
      image: Schema.String,
    }),
  },
  idempotencyKey: ({ id }) => id,
});

// One workflow per attempt: it starts the execution environment, then ends the attempt when its lease expires.
export function attemptWorkflows(
  engine: Layer.Layer<WorkflowEngine.WorkflowEngine>,
  {
    dispatch,
    lease,
  }: {
    dispatch: (attempt: QueuedAttempt) => Promise<void>;
    lease: (attempt: QueuedAttempt) => Promise<number>;
  }
) {
  const supervision = Attempt.toLayer(
    Effect.fnUntraced(function* supervise(attempt) {
      // A failed dispatch leaves the attempt queued: its claim timeout ends it.
      yield* Activity.make({
        name: "dispatch",
        execute: Effect.tryPromise(async () => await dispatch(attempt)).pipe(
          Effect.ignore({ log: true })
        ),
      });

      for (let check = 0; ; check += 1) {
        const remaining = yield* Activity.make({
          name: `lease/${check}`,
          success: Schema.Number,
          execute: Effect.promise(async () => await lease(attempt)),
        });

        if (remaining === 0) {
          return;
        }

        yield* DurableClock.sleep({
          name: `lease/${check}`,
          duration: remaining,
        });
      }
    })
  );

  const runtime = ManagedRuntime.make(
    supervision.pipe(Layer.provideMerge(engine))
  );

  return {
    runtime,
    start: async (attempt: QueuedAttempt) => {
      await runtime.runPromise(Attempt.execute(attempt, { discard: true }));
    },
  };
}
