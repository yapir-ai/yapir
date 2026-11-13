import { userRow } from "@test/kit/factories/user";
import { expect, test } from "@test/kit/test";
import { z } from "zod";

test("returns the signed-in user without fetching the discovery document of the identity provider", async ({
  page,
  oidc,
}) => {
  const response = await page.request.get("/api/auth/get-session");

  const { user } = z
    .object({ user: z.object({ email: z.string() }) })
    .parse(await response.json());

  expect(user.email).toBe(userRow().email);
  expect(await oidc.requests()).toEqual([]);
});
