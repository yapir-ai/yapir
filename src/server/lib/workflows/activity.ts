import { constructing, record } from "./runtime";

interface Operation<Args extends unknown[]> {
  execute: (...args: Args) => Promise<void>;
}

type Factory<Args extends unknown[]> = (deps: never) => Operation<Args>;

export interface Activity {
  readonly operation: Factory<never>;
  readonly instance: Operation<never>;
}

export function activity<Args extends unknown[]>(
  operation: Factory<Args>,
  instance: NoInfer<Operation<Args>>
): Activity {
  return { operation, instance };
}

const performs = <Args extends unknown[]>(
  candidate: Activity,
  operation: Factory<Args>
): candidate is Activity & { instance: Operation<Args> } =>
  candidate.operation === operation;

export function inject<Args extends unknown[]>(operation: Factory<Args>) {
  const runtime = constructing();

  return (...args: Args) => {
    record(runtime, async (activities) => {
      const scoped = activities.find((candidate) =>
        performs(candidate, operation)
      );

      await scoped!.instance.execute(...args);
    });
  };
}
