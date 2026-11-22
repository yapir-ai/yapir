# The workflow engine stores the fields and replays only run()

A workflow is a class whose fields are its state, whose `run()` is its story, and whose public methods are its handlers. The engine in `src/server/lib/workflows/` stores the fields of each instance after each turn. It also stores a journal of the awaits of `run()`, and each step of the journal holds the fields that `run()` saw when it resumed. To revive an instance, the engine replays only `run()` from this journal, then installs the stored fields. Handlers are not recorded and not replayed. A Worker keeps no memory between two requests, so each request revives the instances that it touches.

## Considered options

- Record each handler call and replay all of them, as Temporal does. The history grows with each call. An instance that a runner pulls every 5 seconds for hours replays thousands of calls, and the history stores each handler argument.
- No journal: `run()` starts again at each turn and skips what the fields show as done. The author then writes a state machine instead of a story.
- One lock for each instance, and messages between instances through a table. A parent and its child then change in two commits, and a check that covers both rows can fail between them.

## Consequences

- The cost of a turn depends on the number of awaits of `run()` since its start or its last `continueAsNew()`, not on the number of handler calls. A workflow that never ends calls `continueAsNew()` to keep its journal short.
- A change to a handler, to `rows()` or to a field does not break the instances in flight. A change to the order or the kind of the awaits of `run()` makes the next turn of an instance in flight fail and write nothing, when the journal shows the change. A change before the first step of the journal does not show. The engine has no version API: let the instances end, or reset their data.
- The lock domain is the tree. Each turn locks the row of the root with `select ... for update`, and no other row. A signal between a parent and a child and the result of a child apply in the same transaction. Two turns never wait for each other in a cycle.
- Only the sweep of the cron fires a deadline. A handler call after a deadline still runs when the sweep has not run.
- An activity runs once, after the commit, in `waitUntil`. The engine does not store it and does not try it again. A crash between the commit and the activity loses the activity. The workflow must recover with a deadline, as [ADR 0001](0001-runner-drives-executions.md) expects for the dispatch.
