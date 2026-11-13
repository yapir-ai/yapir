import { down, up } from "@scripts/instance";

import { startOidc } from "./oidc";

export default async function globalSetup() {
  const identityProvider = await startOidc();

  const instance = await up({
    seed: false,
    browser: false,
    mode: "test",
    oidcDiscoveryUrl: identityProvider.discoveryUrl,
  });

  process.env.YAPIR_INSTANCE_ID = instance.id;
  process.env.ENCRYPTION_KEY = instance.env.ENCRYPTION_KEY!;

  return async () => {
    await down(instance.id);
    await identityProvider.close();
  };
}
