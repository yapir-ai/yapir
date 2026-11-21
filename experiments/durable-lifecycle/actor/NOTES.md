# Durable actors

The Task and the Execution are entities: a class whose fields are its durable state and whose public methods are its handlers. Read `lifecycle.ts`.

## API surface: 8 concepts

1. `Entity<Self, Outside>`: the base class. Fields are state, public methods are handlers.
2. Handler: synchronous, one at a time per entity, all or nothing.
3. `this.send(Class, id).handler(...)`: a message to an entity.
4. `this.after(ms).handler(...)`: a message to itself later. It replaces the pending timer of the same handler.
5. `this.create(Class, ...constructorArgs)`: a new entity. Its constructor runs once, never at a rebuild.
6. `this.outside.call(...).onError(handler)`: an outside call, at least once. A rejection goes to the handler.
7. `platform.ask(Class, id).handler(...)`: a request from a route, with the handler's answer. An entity with no constructor arguments exists for every id.
8. `platform.read(Class, id)`: the committed state.

## Rules for lifecycle code

- Handlers are synchronous. The types hide async methods from `send`, `ask` and `after`. The runtime rejects a handler that returns a promise.
- The outside world is reached only through `this.outside`. The types cannot stop a handler that imports a client and calls it: the call then escapes the outbox and runs again at each retry.
- State is JSON: no `Map`, `Date`, class instance or `#private` field. The types do not catch this. The restart mode does: the field is lost.
- No determinism rule: nothing replays, so `crypto.randomUUID()` is allowed. Reading the time needs a ninth concept, `this.now`, so that tests keep a virtual time.
- A handler that throws commits nothing: no state, no message, no timer, no call.
- The types check the handler names and arguments of `send`, `after`, `ask`, `onError` and `create`, and the names and arguments of the outside calls. They do not check that `Self` is the class itself.

## Task list and metrics

The state of each entity is one JSONB row: `entities(kind, id, state)`. The task list filters on `state->'phase'->>'state'` with an expression index. Metrics run SQL over the `Execution` rows (`outcome`, `usage`). Durations need two more fields, `claimedAt` and `endedAt`, and `this.now`. The Execution sends `executionClaimed` to the Task only so that the Task row holds `running` for the list page.

## Deployment with tasks in flight

Nothing replays, so new code runs on the old state at the next handler. A Task that rests for weeks is a row, not a stack.

- A new field needs a default for the old rows: a field initializer does not run at a rebuild. Migrate the JSONB in SQL, as for any table.
- Handler names and arguments are the wire format of the messages and timers in the outbox. To rename one, keep the old handler until no message names it. Timers live at most 10 minutes.
- A changed rule applies at once to every task, the ones in flight included. This is the opposite of the version pinning that a replay platform requires.

## The real platform

- Storage in PostgreSQL: `entities(kind, id, state, version)`, `outbox(kind, id, handler, args, due_at)` for messages and timers, and `calls(name, args, on_error, from)`. A handler is one transaction: `SELECT … FOR UPDATE` on its row, run the handler, write the row and the outbox, commit. The row lock is still there, in the platform, not in the lifecycle.
- Compute, Worker: a route runs `ask` in a transaction, then drains the outbox in `waitUntil`. The cron each minute fires the due timers and retries the calls and messages that a dead isolate left. Timers are then accurate to a minute, which is enough for 2 and 10 minutes.
- Compute, Bun: the same code, and a loop polls the outbox with `FOR UPDATE SKIP LOCKED` instead of the cron.
- Durable Objects would give a single writer and alarms for free, but not in the Bun container. PostgreSQL works in both.

## Alternatives rejected

- The Execution inside the Task entity, in one serialization domain: it removes the `eventUndelivered` race, but the Execution story then dissolves into the Task's handlers.
- Events kept by the Task, with the Execution asking for them at a pull: an `await` on another entity needs a journal and a replay, or it brings back the `delivered` state of today's inbox.
- `async` handlers that `await` `authenticateRunner` and `claimContext`: it invites an `await dispatch(...)` that holds the entity for minutes. The scenario where a runner claims before its dispatch returns would then deadlock.
- Named timers with `cancel`, or one alarm per entity in the Durable Object manner: `after` replaces the timer of the same handler, so the lease replaces the claim timeout. Both timers reuse `fail`, whose guard on an ended execution is domain logic and not a stale-timer guard.
- `Messages<this>`: inside the class, TypeScript defers the mapped type and accepts any arguments. `Self` costs one type argument and makes every message checked.
- One state machine class per execution state, in the Akka `become` manner: it removes the `if (this.outcome)` guards but doubles the API.

## What the scenarios forced

- `eventUndelivered`: the Task forwards an event while the Execution ends, so the Execution gives it back. Actors add this race. Today's single row lock does not have it. `entities.test.ts` shows it.
- The runner proof and the claim context stay in the route, because handlers cannot await. The lifecycle does not show that a claim needs them.
- `executionClaimed` exists only for the task list. `claimed` and `outcome` are two fields because a pull before the claim is not a case of the lifecycle.
- `received` keeps every event id forever. The real platform keeps it as a unique index outside the state.
- A guard on `this.outcome` starts each of the six Execution handlers. It is domain logic: an ended execution changes nothing, and its runner learns how it ended.
