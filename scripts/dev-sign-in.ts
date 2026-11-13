import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import type { Connect, Plugin } from "vite";

const route = "/__dev/sign-in";

export async function createSignInLink(
  directory: string,
  cookie: string,
  origin: string
) {
  const token = randomBytes(32).toString("hex");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, token), cookie, { mode: 0o600 });

  return `${origin}${route}?token=${token}`;
}

async function signIn(
  directory: string,
  request: IncomingMessage,
  response: ServerResponse,
  next: Connect.NextFunction
) {
  try {
    await consumeToken(directory, request, response);
  } catch (error) {
    return next(error);
  }
}

async function consumeToken(
  directory: string,
  request: IncomingMessage,
  response: ServerResponse
) {
  const token = new URL(request.url!, "http://localhost").searchParams.get(
    "token"
  );

  const file = path.join(directory, path.basename(token ?? ""));

  if (!token || !existsSync(file)) {
    response.writeHead(403).end("Unknown or used sign-in token");

    return;
  }

  const cookie = await readFile(file, "utf-8");
  await rm(file);
  response
    .writeHead(302, {
      location: "/",
      "set-cookie": `${cookie}; Path=/; HttpOnly; SameSite=Lax`,
    })
    .end();
}

// Development only, outside the Worker: consumes a one-time token, sets its session cookie and opens the app.
export function devSignInPlugin(directory: string): Plugin {
  return {
    name: "yapir:dev-sign-in",
    configureServer(server) {
      server.middlewares.use(route, (request, response, next) => {
        void signIn(directory, request, response, next);
      });
    },
  };
}
