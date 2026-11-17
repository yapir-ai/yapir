import type { AgentSelect } from "@server/lib/db/schema";
import type { PreparedEvent } from "@server/lib/events/event-definition";
import { setup, types } from "xstate";
import type { EventFromLogic } from "xstate";

import type { End, UsageColumns } from "./machine/attempt";

const maxConsecutiveFailures = 3;

// XState requires a params schema for each declared action: `void` lets `enq(action)` take no argument.
// oxlint-disable-next-line typescript/no-invalid-void-type
const noParams = { params: types<void>() };

const lifecycle = setup({
  states: { idle: {}, queued: {}, running: {}, blocked: {}, stopped: {} },
  schemas: {
    context: types<{ consecutiveFailures: number }>(),
    events: {
      accept: types<{ event: PreparedEvent; duplicate: boolean }>(),
      claim: types<{ agent: AgentSelect; tokenHash: string }>(),
      pull: types<{ usage: UsageColumns | undefined }>(),
      endTurn: types<{ usage: UsageColumns | undefined; pending: boolean }>(),
      fail: types<{ error: string; pending: boolean }>(),
      stop: types<{ stoppedById: string }>(),
    },
    actions: {
      receiveEvent: { params: types<PreparedEvent>() },
      queueAttempt: noParams,
      startAttempt: {
        params: types<{ agent: AgentSelect; tokenHash: string }>(),
      },
      renewLease: { params: types<UsageColumns | undefined>() },
      deliverPendingEvents: noParams,
      acknowledgeTurnEvents: noParams,
      returnTurnEvents: noParams,
      endAttempt: { params: types<End>() },
      release: noParams,
    },
  },
});

const resting = lifecycle.createStateConfig({
  on: {
    accept: ({ event, actions }, enq) => {
      if (event.duplicate) {
        return;
      }

      enq(actions.receiveEvent, event.event);

      return { target: "queued" };
    },
  },
});

const active = lifecycle.createStateConfig({
  on: {
    accept: ({ event, actions }, enq) => {
      if (!event.duplicate) {
        enq(actions.receiveEvent, event.event);
      }
    },

    fail: ({ context, event, actions }, enq) => {
      enq(actions.endAttempt, { outcome: "failed", error: event.error });
      enq(actions.returnTurnEvents);
      enq(actions.release);
      const consecutiveFailures = context.consecutiveFailures + 1;

      if (!event.pending) {
        return { target: "idle", context: { consecutiveFailures } };
      }

      if (consecutiveFailures >= maxConsecutiveFailures) {
        return { target: "blocked", context: { consecutiveFailures } };
      }

      return {
        target: "queued",
        reenter: true,
        context: { consecutiveFailures },
      };
    },

    stop: ({ event, actions }, enq) => {
      enq(actions.endAttempt, {
        outcome: "stopped",
        stoppedById: event.stoppedById,
      });
      enq(actions.returnTurnEvents);
      enq(actions.release);

      return { target: "stopped" };
    },
  },
});

export const taskLifecycle = lifecycle.createMachine({
  context: { consecutiveFailures: 0 },
  initial: "idle",
  states: {
    idle: resting,
    blocked: resting,
    stopped: resting,

    queued: {
      entry: ({ actions }, enq) => {
        enq(actions.queueAttempt);
      },
      on: {
        ...active.on,

        claim: ({ event, actions }, enq) => {
          enq(actions.startAttempt, event);

          return { target: "running" };
        },
      },
    },

    running: {
      on: {
        ...active.on,

        pull: ({ event, actions }, enq) => {
          enq(actions.renewLease, event.usage);
          enq(actions.deliverPendingEvents);
        },

        endTurn: ({ event, actions }, enq) => {
          enq(actions.renewLease, event.usage);
          enq(actions.acknowledgeTurnEvents);

          if (event.pending) {
            enq(actions.deliverPendingEvents);

            return;
          }

          enq(actions.endAttempt, { outcome: "succeeded" });

          return { target: "idle", context: { consecutiveFailures: 0 } };
        },
      },
    },
  },
});

export type TaskLifecycleEvent = EventFromLogic<typeof taskLifecycle>;
