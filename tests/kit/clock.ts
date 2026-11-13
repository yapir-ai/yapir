import { expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

// The clock of the server under test: it stays at the time that the test sets.
export function serverClock(request: APIRequestContext) {
  let now = new Date();

  // Null gives the system time back to the server.
  async function put(time: Date | null) {
    const response = await request.put("/api/clock", {
      data: { now: time?.toISOString() ?? null },
    });

    expect(response.status()).toBe(204);
  }

  async function set(time: Date) {
    await put(time);
    now = time;
  }

  return {
    get now() {
      return now;
    },
    set,
    skip: async (duration: number) =>
      await set(new Date(now.getTime() + duration)),
    release: async () => await put(null),
    tick: async () => {
      const response = await request.post("/api/cron");

      expect(response.status()).toBe(204);
    },
  };
}
