# The fitted platform

The primitives come from what the Task and Execution lifecycle needs. The platform keeps state snapshots. It has no journal and no replay, thus no determinism rule for the lifecycle code.

## API surface: 13 concepts

1. `Entity`: a class that lives for weeks. Its first call creates it.
2. `Workflow`: a piece of work of an entity that ends once, with a typed `End`.
3. Handler: a public method. The handlers of an entity and of its workflows run one at a time. A return commits. A throw changes nothing.
4. `state`: the only durable data of a class. It is plain JSON.
5. `Inbox` (`add`, `deliver`, `acknowledge`, `giveBack`): the durable queue of an entity. It keeps each event ID once.
6. Slot (`child`, `live`, `start`): one live workflow of a kind at most. Its `ended` callback runs in the handler that ends the workflow.
7. `end` and `Reply`: after `end`, no handler runs. Each call gets `{ ended }`.
8. `deadline()`: the longest time without a call, and what happens then.
9. `started()`: runs once, when the workflow starts.
10. `read`: the outside calls that a handler awaits.
11. `effect`: an outside call after the commit, at least once. `rejected` names the handler that gets the error.
12. `view()`: the read model of an entity.
13. `Platform` (`entity`, `workflow`, `view`, `history`): what the routes call.

## What each fitted primitive replaces

- `Inbox`, against an array in `state`: an estimated 20 lines less in the lifecycle. The events stay rows, outside the snapshot, with the IDs kept forever.
- Slot in the turn of the entity, against a child that signals its parent later: no guard against a stale execution. `queued` and `running` come from the live execution, so the task does not store them a second time.
- `end` and `Reply`, against a guard at the top of each runner handler: 4 guards less. A late call cannot change anything.
- `deadline()`, against timers: no renewal in `pull` and `endTurn`, no cancel at the end, no guard against a timer that fires late.
- No retry budget: a counter in `state` is 2 lines, and the rule stays in `Task`.

## Rules for lifecycle code

- Only `state` survives. The platform builds the instance again for each handler. The types reject `Date`, `Map` and functions in `state`. They do not catch a field that the author keeps outside `state`.
- The real platform can run a handler again after a write conflict. Thus a handler awaits only `read` calls. The types make the effects unreachable through `read`. They do not catch a `read` function that writes.
- `rejected` must name a public handler that takes the error message, and the arguments of an effect must match its function. The types catch both.
- An `End` variant without a rule in `Task` does not compile.
- The types do not catch a handler called in the wrong phase, such as `pull` before `claim`. The handler must read `state`.
- The types do not catch a missing `giveBack`. The next `acknowledge` then drops the events of the unfinished turn.

## Read models

- Task list: the platform stores `view()` at each commit, in the same transaction. The real platform writes it to indexed columns of the entity row. The page filters by state with SQL.
- Metrics: `history` reads the workflow rows (`id`, `state`, `ended`). SQL aggregates over them. Hot fields, such as the outcome and the usage, become generated columns.

## Deployment with tasks in flight

- The next handler of an old task runs the new code on the stored `state`. Nothing replays, so nothing diverges.
- The deployment contract is data: the shapes of `state`, `End` and the inbox events, and the class names. Change a shape with a SQL migration, as for a column today.
- An outbox row holds a handler name, for some seconds. A stored deadline keeps the old duration until the next call.

## What the real platform needs

- PostgreSQL tables: `entity` (state, view columns, version), `workflow` (state, end, `deadline_at`), `inbox` (unique entity and event ID, order, status), `outbox`.
- A turn loads the entity row, its live workflows and its open inbox rows. It runs the handler in memory and writes all in one transaction with a version check. A conflict runs the turn again. No lock is held while a handler awaits. The Worker and the Bun container do the same.
- `inbox.add` is synchronous here. The real one finds a known ID through the unique index at the commit, then runs the turn again with that answer.
- Deadlines: the cron trigger of the Worker, or a timer in Bun, expires the rows that are due. Each call first checks the deadline of its workflow, so an answer does not depend on the delay of the sweep. The throwaway runtime does not need this check.
- Effects: the request runs them after the commit (`waitUntil` on the Worker). The sweep runs again the outbox rows that did not settle.
- This is the storage of today: rows, a sweep, effects after the commit. The change is that the lifecycle code does not see it.

## Where the fit hurts when the lifecycle changes

- A retry after a delay, or a maximum duration of an execution: a workflow has one deadline, counted from its last call, and an entity has no timer. This needs a general timer.
- Two live executions for one task: a slot holds one, and the delivered events of the inbox have no owner.
- A new inbox behavior (one event per turn, priorities, merged events) is a platform change.
- A rule across tasks, such as a limit of running executions per automation: an entity cannot call another entity.
- An effect that gives a result to the lifecycle: only its rejection comes back.

## Rejected alternatives

- Journal with replay: a runner pulls at an interval for the life of the task, so the journal grows without limit, and a deployment can break the replay of a task that is weeks old.
- A `Lease` object that owns the single claim and both timeouts: it moves lifecycle rules into the platform. `deadline()` keeps the durations and the errors in `Execution`.
- An inbox that gives back by itself when a workflow ends: same problem. `Task` calls `giveBack`.
- Handler tables for each phase, checked by the types: `Execution` has 2 phases and 1 phase check. A second way to declare handlers costs more than this check.
- Synchronous handlers only, with the claim authentication in the route: the claim rule leaves the lifecycle code.

## What the scenarios forced

- A second claim on a running execution gets `{ claimed: false, outcome: null }`. This is the one phase check. This call also renews the deadline, as each call does.
- `fail` works before the claim, so `fail` has no phase.
- Quiescence: the test kit resolves each call after a macrotask.
- `TaskView` contains the executions: the adapter joins `view` and `history`.
- Not written: "a failure without a pending event rests the task as idle". A live execution always holds an event, waiting or delivered, so no scenario reaches this path.
