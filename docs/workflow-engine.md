# Workflow engine

The engine in `src/server/lib/workflows/` runs long processes durably on Postgres. [ADR 0008](adr/0008-workflow-engine-stores-fields-and-replays-run.md) records the design. The probe workflows of the tests, `tests/kit/workflows/counter.ts` and `tests/kit/workflows/helper.ts`, use each feature.

## The model

A workflow is a class that extends `Workflow`. A child workflow extends `Workflow<Parent>`.

- The own fields of the object are its state. A field holds a JSON value, `undefined` or a child handle. The engine stores the fields after each turn.
- `run()` is the story of the instance. Its arguments and its result are JSON. The engine replays `run()` from a journal of its awaits when it revives the instance.
- Each public method is a handler. A handler runs once, on the stored fields, and returns its reply. It is never replayed.
- `rows()` gives the rows of other tables that the instance owns.

A turn is one input on one tree of instances, in one transaction: a handler call or a wake of the sweep. The turn locks the row of the root, revives the instances that the input reaches, runs the input and what it causes, writes the rows, and stores the instances.

## Rules of run()

- Await only the promises that the engine gives: `this.until()`, `child.result` and `this.continueAsNew()`. Await one at a time. Do not use `Promise.race` or `Promise.all` on them. A foreign await, such as `fetch`, makes the turn fail.
- Read the time from `this.now`. Do not use `Date`, a random value or I/O in `run()`. A handler or a field initializer can use them, because they run once.
- Do not keep a field in a local across an await. At each await, the engine replaces each field with a copy of its stored value.
- A `run()` that never ends ends each loop with `return await this.continueAsNew()`. `run()` then starts again with the same arguments and the current fields, and the journal is empty.

## Handlers and signals

- `engine.get(Class, id).handler(...)` calls a handler in its own transaction and returns its reply after the commit. An absent instance gives `404 WORKFLOW_NOT_FOUND`.
- `engine.start(Class, id, ...runArgs).handler(...)` creates the instance at the first call when it is absent, runs `run()` to its first await, then calls the handler. Only a root workflow can start from a route.
- `engine.transaction(async ({ tx, get, start, delete }) => ...)` runs several calls and your own statements in one transaction. `delete` removes the tree of a root. It does not remove the rows of `rows()`.
- In a workflow, `this.start(Class, ...runArgs)` starts a child from `run()`. A call on `this.parent` or on a child handle is a signal: it has no reply, and it runs later in the same turn, in order.
- When the `run()` of a child returns, `await child.result` of its parent resumes in the same turn.

## Timers

`this.until(condition, { deadline })` resolves `true` when the condition is true after a handler, a signal or a step. It resolves `false` only in a wake turn, when `deadline()` is before the time of the turn. The cron calls `engine.sweep()` each minute. The sweep wakes only the instances of the workflow classes of its engine. A handler can move the deadline: the sweep reads `deadline()` again under the lock.

## Activities

`inject(operation)` in a field initializer gives a function that records a call of the operation. Give the operation of the scope to the engine with `activity(operation, instance)`. The engine runs each recorded call once, after the commit, in `executionContext.waitUntil`. A call in a replayed part of `run()` has no effect. A failure does not reach the workflow, and the engine does not try again.

## Rows

`rows()` returns `upsert(table, values)` for a row that the instance owns completely, and `update(table, values)` for some columns of a row that exists. `update` needs the primary key in `values`: without it, the update changes no row. The engine compares the rows at the revive and at the end of the turn, and writes only the rows that changed: the root first, then the other instances by ID, then the order of `rows()`. A row that leaves `rows()` stays in its table.

## Code changes and instances in flight

| Change | Effect on an instance in flight |
| --- | --- |
| A handler, `rows()` or a private method | None. |
| A new field | The instance keeps the value of the initializer until a handler changes it. |
| A removed field | The engine drops the stored value. |
| The order or the kind of the awaits of `run()` | The next turn fails and writes nothing. Let the instances end, or reset their data. |

## Tests

Test a workflow through its entry, as `tests/AGENTS.md` tells. Insert the `workflow` rows of the Given with `tests/kit/factories/workflow.ts`, and assert the whole rows. `tests/workflows/` tests the engine with the probe workflows and the routes of `tests/kit/server.ts`.
