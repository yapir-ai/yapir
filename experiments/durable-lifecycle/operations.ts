interface Deps {
  env: Record<string, string>;
}

export declare function dispatchOperation(
  deps: Deps
): (executionId: string) => Promise<void>;

export declare function releaseOperation(
  deps: Deps
): (executionId: string) => Promise<void>;
