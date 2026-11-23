import { constructing, record } from "./runtime";

type Effect = (...args: never[]) => Promise<void>;

type Factory<Activities> = (deps: never) => Activities;

export interface Activity {
  readonly factory: Factory<object>;
  readonly instance: object;
}

export function activity<Activities extends object>(
  factory: Factory<Activities>,
  instance: NoInfer<Activities>
): Activity {
  return { factory, instance };
}

const comesFrom = <Activities extends object>(
  candidate: Activity,
  factory: Factory<Activities>
): candidate is Activity & { instance: Activities } =>
  candidate.factory === factory;

export function inject<
  Activities extends Record<Name, Effect>,
  Name extends keyof Activities,
>(factory: Factory<Activities>, name: Name) {
  const runtime = constructing();

  return (...args: Parameters<Activities[Name]>) => {
    record(runtime, async (activities) => {
      const scoped = activities.find((candidate) =>
        comesFrom(candidate, factory)
      );

      await scoped!.instance[name](...args);
    });
  };
}
