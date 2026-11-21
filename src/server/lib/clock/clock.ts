import { Context } from "effect";

// The source of the current time: services read it, never Date directly.
export interface Clock {
  readonly now: Date;
}

export const systemClock: Clock = {
  get now() {
    return new Date();
  },
};

export class AppClock extends Context.Service<AppClock, Clock>()(
  "yapir/Clock"
) {}
