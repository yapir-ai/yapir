# loop: the Task as an entity workflow, the Execution as its child

The lifecycle is `task.ts` and `execution.ts`. Each class has one `run()`, journaled and replayed.

## API surface: 12 concepts

A lifecycle author uses 7:

1. `Entity`: lives forever under an ID that the outside chooses. `run()` tells one cycle. When it returns, the platform saves the fields, forgets the journal, and calls `run()` again.
2. `Workflow<Input, Result>`: a child that an entity starts. It ends with a result. Its messages still answer after its end.
3. A public method is a message. Its return value is the answer.
4. A public field or getter is state that the outside reads.
5. `this.until(condition, timeout?)`: the only wait, and the only timer.
6. `this.outside`: the `Deps`. The journal keeps each answer.
7. `this.start(Class, input)`: gives a `Child` with `id`, `result`, the fields to read and the messages to call.

A route or a page uses 3: `platform.to(Class, id)`, `platform.read(Class, id)`, `platform.children(Class, entityId)`. A test uses 2 more: `runtime.advance(ms)` and `runtime.restart()`.

No `defineSignal`, `setHandler`, `defineQuery` or `continueAsNew`: `keyof` on the class gives the messages and the state.

## Rules

- The same journal must give the same operations in the same order. Lifecycle code must not use `Date.now`, `Math.random`, `crypto.randomUUID`, `fetch`, timers, or a variable of the module. It must await only `until`, an `outside` call or a child result.
- The API makes the right way short: the platform makes the child IDs, `until` is the only clock, and `Deps` is reachable only through `this.outside`.
- An `outside` call can run twice after a restart. Each `Deps` function must accept that.
- The `run()` of an entity must wait before it returns. If not, the runtime runs it in a loop without end.
- A field must be data that `structuredClone` accepts. A field that holds a `Child` at the end of a cycle makes the save fail.

When code breaks determinism, there are two results. If the operations change, the replay throws `The replay diverged`, and the entity stops until a correct version is deployed: see the third test of `platform.test.ts`. If only a field changes, nothing detects it.

The types catch: the name, parameters and answer of a message, the input and result of a child, the signature of an outside call, a write to a field of a child, a call to a private method or to `run`, a read of a private field. `platform.test.ts` holds one `@ts-expect-error` for each.

The types do not catch: determinism, the data rule, the wait rule. They also do not separate the messages of the parent from the messages of the outside: `platform.to(Execution, id).stop()` compiles. The routes must expose only the runner messages.

Two guards are possible and not built: a lint rule that bans these globals in workflow files, and a test mode that restarts after each input, as the shared scenarios do.

## Task list and metrics

Each commit writes the state of the entity and of each changed child to one row per instance: a `task` row with `state` and `consecutive_failures`, an `execution` row with `claimed`, `end` and `usage`. The list page and the metrics are SQL on these rows, as today. `read` and `children` stand for that SQL in the prototype. The adapter builds the task page from the two.

One gap: the metrics need times. The platform can stamp the start and the end of each child. A claim time needs a `this.now()`, which is one more concept. It is not built.

## Deployment

- A task at rest is only its fields. A new field takes its initializer. A renamed or removed field needs a data migration, like a column. No replay must stay compatible for weeks.
- A task in a cycle has an execution in flight, for minutes or hours. Its journal replays on the new code. A change in the order of the outside calls or of the timers diverges. The platform must then keep the previous class version until its cycles end, with a version stamp on each cycle, or drain the executions before the deployment. Neither is built.

## What the real platform needs

- Storage in PostgreSQL: `entity(id, class, fields, since, wake_at)`, `journal(entity_id, n, entry)`, and the state rows.
- One activation is one transaction: lock the entity row, load the fields and the journal of the cycle, replay, apply the input, write the entries and the state rows, commit. The outside calls run after the commit. Each answer is a new activation. A claim is three activations in one HTTP request.
- The Worker keeps no instance between requests, so each request replays the cycle. The cost grows with the journal of the cycle: an execution of one hour with a pull each 30 seconds is more than 120 entries. The Bun container keeps the instances in memory and replays only after a restart. With more than one process, it needs the same row lock.
- Timers: the cron reads `wake_at` each minute. On the Worker, a timer can fire one minute late, like the sweep of today. The same cron runs again the outside calls that have no answer.
- The runtime finds quiescence with `setImmediate`. The Worker has none: the real platform needs its own scheduler for the replay. This is the largest unknown.

## Alternatives rejected

- An explicit `for (;;)` with a continue-as-new call: a local variable that crosses the call is lost without an error. With one cycle per `run()`, no local can cross.
- One journal per Execution, as in Temporal: the Task can give an event to an Execution that just ended, and the runner calls need an index from execution to task. One journal per Task removes the race and the guards against stale attempts.
- A `run()` that receives its messages (`await this.next("pull")`): the whole story is in `run()`, but it becomes one switch with reply objects.
- A list of executions in the Task: it copies the state of each Execution.
- An awaited `release`: a slow call that is only best effort then blocks the Task.
- Random child IDs: they need a journaled value. `task/3` is deterministic but guessable, so the claim must prove its runner. It does.

## What the scenarios forced

- A runner call to an ended execution gets an answer. An ended child therefore keeps its fields forever, and each runner message starts with `if (this.end)`.
- The state `running` depends on the claim, which the Execution receives. The Task reads `execution.claimed`. Temporal does not allow this read.
- The events that a stopped or blocked task keeps must not start an execution. The Task therefore has two lists, `inbox` and `unfinished`.
- The set of received event IDs grows for the life of the task.
- Each input resolves at quiescence. `idle()` in the runtime exists only for that.
- Not forced, and dropped: today's path "failed with no waiting event, then idle". An execution that did not end always holds one event or more.
- Not refused: a pull before the claim. The baseline answers `{ attempt: null }`.
- `runtime.ts` is 515 lines, above the aim of 400.
