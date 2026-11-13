import type { CapabilityRegistry } from "./capability-definition";

export function capabilityListOperation({
  capabilityRegistry,
}: {
  capabilityRegistry: Promise<CapabilityRegistry>;
}) {
  async function execute() {
    return [...(await capabilityRegistry).values()].map(
      ({
        name,
        description,
        scopable,
        provider,
        resource,
        label,
        gitHost,
      }) => ({
        name,
        description,
        scopable: scopable ?? false,
        provider,
        resource,
        label,
        gitHost,
      })
    );
  }

  return { execute };
}

export type CapabilityListOperation = ReturnType<
  typeof capabilityListOperation
>;
