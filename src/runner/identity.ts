import { z } from "zod";

export async function identityToken(audience: string) {
  const {
    ACTIONS_ID_TOKEN_REQUEST_URL,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    YAPIR_ID_TOKEN,
  } = process.env;

  if (ACTIONS_ID_TOKEN_REQUEST_URL === undefined) {
    // GitLab CI gives the token in the variable that the job declares.
    return YAPIR_ID_TOKEN;
  }

  const url = new URL(ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set("audience", audience);

  const response = await fetch(url, {
    headers: { authorization: `bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
  });

  return z.object({ value: z.string() }).parse(await response.json()).value;
}
