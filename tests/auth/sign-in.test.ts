import { expect, test } from "@test/kit/test";
import { z } from "zod";

test("redirects to the authorization endpoint found in the discovery document of the identity provider", async ({
  request,
  oidc,
}) => {
  const response = await request.post("/api/auth/sign-in/social", {
    data: { provider: "oidc", callbackURL: "/" },
  });

  const { url, redirect } = z
    .object({ url: z.string(), redirect: z.boolean() })
    .parse(await response.json());

  expect(response.status()).toBe(200);
  expect(redirect).toBe(true);
  expect(url).toMatch(new RegExp(`^${oidc.origin}/authorize\\?`, "u"));
  expect(await oidc.requests()).toEqual(["/.well-known/openid-configuration"]);
});
