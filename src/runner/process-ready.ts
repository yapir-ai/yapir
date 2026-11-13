import type { Subprocess } from "bun";

export async function waitUntilReady(
  name: string,
  child: Subprocess,
  ready: () => Promise<boolean>
) {
  const started = await Promise.race([
    poll(ready).then(() => true),
    child.exited.then(() => false),
  ]);

  if (!started) {
    throw new Error(`${name} exited with code ${child.exitCode}`);
  }
}

async function poll(ready: () => Promise<boolean>) {
  while (!(await ready())) {
    await Bun.sleep(100);
  }
}
