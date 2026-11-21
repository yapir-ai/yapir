# Entity with a workflow in its turn

The Task is an entity. Each Execution is a workflow that lives in the turn of its Task and ends once. Read `lifecycle.ts`.

## API surface: 12 concepts

1. `durable<Outside>()`: gives the two base classes for one set of outside calls.
2. `Entity<Self>`: fields are the state, public methods are the handlers. An entity without constructor arguments exists for every id.
3. `Workflow<Self, Parent, End>`: a piece of work of an entity. It ends once.
4. Handler: synchronous. One handler of an entity or of its workflows runs at a time. It commits all or nothing.
5. `this.start(Class, ...constructorArgs)`: starts a workflow and returns it live. Its constructor runs once, never at a rebuild.
6. `this.parent`: the live entity. The parent and its workflows call each other directly, in the same turn and commit.
7. `this.end(end)`: ends the workflow and returns `Ended`. After it, the platform runs none of its handlers.
8. `this.after(ms).handler(...)`: calls a handler later. It replaces the pending timer of the same handler.
9. `this.outside.call(...).onError(handler)`: an outside call, at least once, after the commit. A rejection goes to the handler.
10. `platform.ask(Class, id).handler(...)`: the answer of an entity handler, or a `Reply` from a workflow: `{ answer }` or `{ ended }`.
11. `platform.read(Class, id)`: the committed state, with `ended` for an ended workflow.
12. `platform.list(Entity, id, Workflow)`: the workflows of one class that the entity started, in the order of their start.

## Rules for lifecycle code

- Handlers are synchronous. The types hide async methods from `ask` and `after`. The runtime rejects a handler that returns a promise.
- The types check the handler names and arguments of `after` and `ask`, and that `onError` names a handler that takes a string. They check the constructor arguments of `start`, and that the workflow names this entity class as its parent.
- The `Reply` type forces a check of `ended` before a read of `answer`. A handler that only ends has the reply `{ ended }`.
- The types do not catch an outside client that a handler imports and calls. That call escapes the outbox and runs again at each retry.
- State is JSON: no `Map`, `Date` or `#private` field. The types do not catch this. The restart mode does: the field is lost.
- A field of an entity can hold its own live workflow. The snapshot stores a reference. A workflow of another entity is not supported.
- The platform guards `ask`, timers and `onError` messages to an ended workflow. A direct call from the parent still runs. The Task clears `execution` in `executionEnded` for this reason.
- A public method that exists for the parent or the child, such as `executionEnded` or `deliver`, is also a handler that a route can ask. The types do not stop this.
- `onError` accepts each handler that takes a string, `stop(userId)` too. The types do not check that `Self` is the class itself.

## Task list and metrics

The Task is one JSONB row. The task list filters on `state->>'state'` with an expression index. Each workflow is one row with its `ended` JSONB. Metrics run SQL over these rows: `ended->>'outcome'` and `state->'usage'`. The platform writes `started_at` and `ended_at` at `start` and `end`, so durations need no lifecycle field. `executionClaimed` exists only so that the Task row holds `running`.

## Deployment with tasks in flight

Nothing replays. New code runs on the old state at the next handler, so a changed rule applies at once to each task in flight.

- A new field needs a value in the old rows: a field initializer does not run at a rebuild. Migrate the JSONB in SQL.
- The wire format is small: the handler names and arguments of timers and `onError` messages, and the class names in stored rows. Direct calls between the Task and its Execution are not wire format. Timers live at most 10 minutes.
- `End` is stored. A change to its shape needs a SQL migration of `ended`.

## The real platform

- Storage in PostgreSQL: `entities(kind, id, state)`, `workflows(id, kind, entity_kind, entity_id, state, ended, started_at, ended_at)`, `timers(target, handler, args, due_at)` unique on `(target, handler)`, and `calls(name, args, on_error, from)`.
- A turn is one transaction: lock the entity row with `FOR UPDATE`, load its live workflows, run the handler, write the changed rows, the timers and the calls, commit. An ask to an ended workflow reads `ended` without a lock.
- Worker: a route runs `ask` in one transaction through Hyperdrive, then starts the calls in `waitUntil`. The cron each minute fires the due timers and retries the calls that a dead isolate left. Timers are accurate to one minute.
- Bun container: the same code. A loop polls the timers and calls with `FOR UPDATE SKIP LOCKED` instead of the cron.

## Alternatives rejected

- `Entity<Self, Outside>`: the factory `durable<Deps>()` removes one type argument from each class.
- `ended` as a field that the author sees: it brings back the `if (this.ended)` guard. The platform keeps it out of the state.

## What the scenarios forced

- The runner proof and the claim context stay in the route, because handlers cannot await. The route reads `parent.id`, so `parent` is public. `claim()` returns a boolean, and the route adds the context.
- `received` keeps each event id forever. The real platform keeps it as a unique index outside the state.
- The `eventUndelivered` race of `actor/` does not exist: an event and an end share one turn. `entities.test.ts` shows it.
