// The source of the current time: services read it, never Date directly.
export interface Clock {
  readonly now: Date;
}

export const systemClock: Clock = {
  get now() {
    return new Date();
  },
};
