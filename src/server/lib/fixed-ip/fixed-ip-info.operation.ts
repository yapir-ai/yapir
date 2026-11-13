import type { FixedIp } from "./fixed-ip.dto";

export function fixedIpInfoOperation({ fixedIp }: { fixedIp?: FixedIp }) {
  function execute() {
    return { address: fixedIp?.address ?? null };
  }

  return { execute };
}
