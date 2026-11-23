import { test as base } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { instanceUrl, readInstance } from "@scripts/instance";
import type { Instance } from "@scripts/instance";
import { signInAuth } from "@scripts/sign-in-auth";
import { relations } from "@server/lib/db";
import type { Db } from "@server/lib/db";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import { serverClock } from "./clock";
import { truncate } from "./database";
import { userRow } from "./factories/user";
import { github } from "./github";
import { inserter } from "./insert";
import { mcp } from "./mcp";
import { oidc } from "./oidc";

export type TestDb = Db & { $client: Pool };

export const test = base.extend<{
  instance: Instance;
  db: TestDb;
  insert: ReturnType<typeof inserter>;
  clock: ReturnType<typeof serverClock>;
  github: ReturnType<typeof github>;
  oidc: ReturnType<typeof oidc>;
  mcp: ReturnType<typeof mcp>;
  outsider: APIRequestContext;
}>({
  // oxlint-disable-next-line eslint/no-empty-pattern Playwright reads a fixture's dependencies from its destructuring pattern.
  instance: async ({}, use) => {
    await use(readInstance(process.env.YAPIR_INSTANCE_ID!));
  },
  baseURL: async ({ instance }, use) => {
    await use(instanceUrl(instance));
  },
  db: async ({ instance }, use) => {
    const db = drizzle(instance.env.DATABASE_URL!, { relations });
    await truncate(db);
    await use(db);
    await db.$client.end();
  },
  insert: async ({ db }, use) => {
    await use(inserter(db));
  },
  // The server's time, fixed at the start of each test.
  clock: async ({ request }, use) => {
    const clock = serverClock(request);
    await clock.set(new Date("2026-09-01T10:00:00Z"));
    await use(clock);
    await clock.release();
  },
  github: async ({ db, request }, use) => {
    await use(github(db, request));
  },
  oidc: async ({ instance }, use) => {
    const identityProvider = oidc(instance.env.OIDC_DISCOVERY_URL!);
    await identityProvider.reset();
    await use(identityProvider);
  },
  mcp: async ({ baseURL }, use) => {
    await use(mcp(baseURL!));
  },
  outsider: async ({ browser, db, insert, instance }, use) => {
    const user = await insert(userRow, {
      id: "01960000-0000-7000-8000-000000000002",
      name: "Uma Outsider",
      email: "uma@yapir.test",
      role: "user",
    });

    const auth = await signInAuth(db, instance.env);

    const context = await browser.newContext();
    await context.addCookies(await auth.getCookies({ userId: user.id }));

    await use(context.request);
    await context.close();
  },
  page: async ({ page, db, insert, instance }, use) => {
    const admin = await insert(userRow);
    const auth = await signInAuth(db, instance.env);
    await page
      .context()
      .addCookies(await auth.getCookies({ userId: admin.id }));
    await use(page);
  },
});

export { expect } from "@playwright/test";
