import { once } from "node:events";
import { createServer } from "node:http";

import { z } from "zod";

export async function startOidc() {
  let requests: string[] = [];

  const server = createServer((request, response) => {
    response.setHeader("content-type", "application/json");

    if (request.url === "/requests") {
      response.end(JSON.stringify(requests));

      if (request.method === "DELETE") {
        requests = [];
      }

      return;
    }

    requests.push(request.url!);
    response.end(
      JSON.stringify({
        issuer: origin,
        authorization_endpoint: `${origin}/authorize`,
        token_endpoint: `${origin}/token`,
      })
    );
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = z.object({ port: z.number() }).parse(server.address());
  const origin = `http://127.0.0.1:${port}`;

  return {
    discoveryUrl: `${origin}/.well-known/openid-configuration`,
    close: async () => {
      server.close();
      await once(server, "close");
    },
  };
}

export function oidc(discoveryUrl: string) {
  const { origin } = new URL(discoveryUrl);

  return {
    origin,
    requests: async () =>
      z
        .array(z.string())
        .parse(await (await fetch(`${origin}/requests`)).json()),
    reset: async () => await fetch(`${origin}/requests`, { method: "DELETE" }),
  };
}
