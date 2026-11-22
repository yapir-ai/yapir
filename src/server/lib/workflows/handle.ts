import type { Json, Value } from "./storage.types";

export type Send = (
  method: string,
  args: Value[]
) => Promise<Value> | undefined;

export interface Extra {
  readonly id?: string;
  readonly result?: Promise<Json>;
}

const children = new WeakSet();

export function handle<Handle>(send: Send, extra: Extra = {}): Handle {
  const proxy = new Proxy(extra, {
    get: (
      target,
      name
    ): Extra[keyof Extra] | ((...args: Value[]) => ReturnType<Send>) =>
      name === "id" || name === "result"
        ? target[name]
        : (...args: Value[]): Promise<Value> | undefined =>
            send(String(name), args),
  });

  if ("result" in extra) {
    children.add(proxy);
  }

  // SAFETY: the type of the handle comes from the class of the workflow, and the Proxy gives a function that sends each of its handler names.
  return proxy as Handle;
}

export const isChild = (value: unknown): value is { readonly id: string } =>
  typeof value === "object" && value !== null && children.has(value);
