import { probeTable } from "@test/kit/workflows/probe-tables";

type ProbeSelect = typeof probeTable.$inferSelect;

export function probeRow({
  id,
  ...override
}: Pick<ProbeSelect, "id"> & Partial<ProbeSelect>): ProbeSelect {
  return { id, count: 0, rounds: 0, echoed: null, ...override };
}

probeRow.table = probeTable;
