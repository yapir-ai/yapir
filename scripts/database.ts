import { execFileSync } from "node:child_process";

import { Client } from "pg";

async function administer(databaseUrl: URL, statements: string[]) {
  const server = new URL(databaseUrl);
  server.pathname = "/postgres";
  const client = new Client(server.href);
  await client.connect();

  for (const statement of statements) {
    await client.query(statement);
  }

  await client.end();
}

const dropStatement = (databaseUrl: URL) =>
  `DROP DATABASE IF EXISTS ${databaseUrl.pathname.slice(1)} WITH (FORCE)`;

export async function dropDatabase(databaseUrl: URL) {
  await administer(databaseUrl, [dropStatement(databaseUrl)]);
}

export async function resetDatabase(databaseUrl: URL) {
  await administer(databaseUrl, [
    dropStatement(databaseUrl),
    `CREATE DATABASE ${databaseUrl.pathname.slice(1)}`,
  ]);
  execFileSync("bun", ["db:migrate"], {
    env: { ...process.env, DATABASE_URL: databaseUrl.href },
    stdio: "inherit",
  });
}
