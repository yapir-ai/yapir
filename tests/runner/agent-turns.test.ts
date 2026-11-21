import { setTimeout as sleep } from "node:timers/promises";

import type { HarnessSession } from "@runner/harness";
import { runTurns } from "@runner/turns";
import { pullInterval } from "@server/lib/executions/execution-lease";
import { expect, test } from "@test/kit/test";
import { Effect } from "effect";
import { TestClock } from "effect/testing";

type Input = Parameters<typeof runTurns>[0];

type Answer = Awaited<ReturnType<Input["server"]["pull"]>>;

type Events = Extract<Answer, { attempt: "running" }>["events"];

const opened: Events[number] = {
  type: "github.pull_request.opened",
  data: {},
  author: null,
};

const commented: Events[number] = {
  type: "github.issue_comment.created",
  data: {},
  author: null,
};

const sent = (events: Events) => ({ send: JSON.stringify({ events }) });

const running = (events: Events = []): Answer => ({
  attempt: "running",
  events,
});

// The harness ends its turn when the test says so, or when it receives the given event.
function fakeHarness(journal: unknown[], lastEvent?: Events[number]) {
  let turn = Promise.withResolvers<undefined>();

  function endTurn() {
    turn.resolve();
    turn = Promise.withResolvers();
  }

  const session: HarnessSession = {
    send(text) {
      journal.push({ send: text });

      if (lastEvent && text.includes(lastEvent.type)) {
        endTurn();
      }
    },
    idle: async () => {
      await turn.promise;
    },
    usage: async () => await Promise.resolve([]),
    export: async () =>
      await Promise.resolve({ sessionId: "session", content: "" }),
    async [Symbol.asyncDispose]() {
      journal.push("dispose");
      await Promise.resolve();
    },
  };

  return { session, endTurn };
}

// The server answers each turn end from the script, in order.
function fakeServer(
  journal: unknown[],
  { pull, turnEnds }: { pull: Input["server"]["pull"]; turnEnds: Answer[] }
): Input["server"] {
  return {
    pull,
    turnEnd: async () => {
      journal.push("turn-end");

      return await Promise.resolve(turnEnds.shift()!);
    },
    saveSession: () => {
      journal.push("save-session");
    },
  };
}

// Each millisecond, the clock of the agent moves forward by one pull interval.
const time = TestClock.adjust(pullInterval).pipe(
  Effect.andThen(TestClock.withLive(Effect.sleep(1))),
  Effect.forever
);

const run = async (input: Omit<Input, "harness">) =>
  await Effect.runPromise(
    Effect.raceFirst(runTurns({ ...input, harness: "opencode" }), time).pipe(
      Effect.provide(TestClock.layer())
    )
  );

test("the agent pulls at each interval and gives the harness the events that arrive during its turn", async () => {
  const journal: unknown[] = [];
  const { session } = fakeHarness(journal, commented);
  const pulls = [running(), running([commented])];

  await run({
    open: async () => {
      journal.push("open");

      return await Promise.resolve(session);
    },
    server: fakeServer(journal, {
      pull: async () => {
        journal.push("pull");

        return await Promise.resolve(pulls.shift()!);
      },
      turnEnds: [running([opened]), { attempt: "succeeded" }],
    }),
  });

  expect(journal).toEqual([
    "open",
    "turn-end",
    sent([opened]),
    "pull",
    "pull",
    sent([commented]),
    "save-session",
    "turn-end",
    "dispose",
  ]);
});

test("the agent stops the harness when the execution ends during a turn", async () => {
  const journal: unknown[] = [];
  const { session } = fakeHarness(journal);

  await run({
    open: async () => await Promise.resolve(session),
    server: fakeServer(journal, {
      pull: async () => {
        journal.push("pull");

        return await Promise.resolve({ attempt: "stopped" });
      },
      turnEnds: [running([opened])],
    }),
  });

  expect(journal).toEqual(["turn-end", sent([opened]), "pull", "dispose"]);
});

test("the agent stops a harness that opens after the execution ended", async () => {
  const journal: unknown[] = [];
  const { session } = fakeHarness(journal);
  const ended = Promise.withResolvers<undefined>();

  await run({
    open: async () => {
      await ended.promise;
      journal.push("open");

      return session;
    },
    server: fakeServer(journal, {
      pull: async () => {
        journal.push("pull");
        setTimeout(ended.resolve, 10);

        return await Promise.resolve({ attempt: "stopped" });
      },
      turnEnds: [],
    }),
  });

  expect(journal).toEqual(["pull", "open", "dispose"]);
});

test("the harness receives the events of a pull that ends after its turn", async () => {
  const journal: unknown[] = [];
  const { session, endTurn } = fakeHarness(journal);

  await run({
    open: async () => await Promise.resolve(session),
    server: fakeServer(journal, {
      pull: async () => {
        journal.push("pull");
        endTurn();
        await sleep(10);

        return running([commented]);
      },
      turnEnds: [running([opened]), { attempt: "succeeded" }],
    }),
  });

  expect(journal).toEqual([
    "turn-end",
    sent([opened]),
    "pull",
    sent([commented]),
    "save-session",
    "turn-end",
    "dispose",
  ]);
});
