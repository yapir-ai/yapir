// The runner imports these durations at runtime: this file must not depend on anything.

// A runner may take minutes to start, for example in a CI job.
export const claimTimeout = 10 * 60_000;
export const leaseDuration = 2 * 60_000;

// The agent pulls at this interval, which renews the lease.
export const pullInterval = 5000;
