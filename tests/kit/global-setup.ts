import { down, up } from "@scripts/instance";
import { relations } from "@server/lib/db";
import { drizzle } from "drizzle-orm/node-postgres";

import { startOidc } from "./oidc";
import { createProbeTables } from "./workflows/probe-tables";

export default async function globalSetup() {
  const identityProvider = await startOidc();

  const instance = await up({
    seed: false,
    browser: false,
    mode: "test",
    oidcDiscoveryUrl: identityProvider.discoveryUrl,
  });

  const db = drizzle(instance.env.DATABASE_URL!, { relations });
  await createProbeTables(db);
  await db.$client.end();

  process.env.YAPIR_INSTANCE_ID = instance.id;
  process.env.ENCRYPTION_KEY = instance.env.ENCRYPTION_KEY!;

  return async () => {
    await down(instance.id);
    await identityProvider.close();
  };
}
