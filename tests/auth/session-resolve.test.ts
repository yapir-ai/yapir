import { signInAuth } from "@scripts/sign-in-auth";
import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";

type TestAuth = Awaited<ReturnType<typeof signInAuth>>;

const credentials = {
  "a session cookie": async (auth: TestAuth, userId: string) => {
    const [cookie] = await auth.getCookies({ userId });

    return { cookie: `${cookie!.name}=${cookie!.value}` };
  },
  "an API key": async (auth: TestAuth, userId: string) => ({
    "x-api-key": (await auth.createApiKey(userId)).key,
  }),
};

for (const [name, headers] of Object.entries(credentials)) {
  test(`serves a request authenticated by ${name} without fetching the discovery document of the identity provider`, async ({
    request,
    db,
    insert,
    instance,
    oidc,
  }) => {
    const user = await insert(userRow);
    const auth = await signInAuth(db, instance.env);

    const response = await request.get("/api/agents", {
      headers: await headers(auth, user.id),
    });

    expect(response.status()).toBe(200);
    expect(await oidc.requests()).toEqual([]);
  });
}
