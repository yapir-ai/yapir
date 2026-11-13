import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@web/components/ui/table";
import {
  costLabel,
  countLabel,
  durationLabel,
  usageTokens,
} from "@web/lib/tasks/task.presentation";

import { DimensionValue, dimensionLabels, groupOf } from "./metrics-dimension";
import type { MetricsDimension } from "./metrics-dimension";
import type { EffectMetrics, ExecutionMetrics } from "./metrics.collection";
import { failureRate, rateLabel } from "./metrics.presentation";

export function MetricsTable({
  dimension,
  groups,
  executions,
  effects,
}: {
  dimension?: MetricsDimension;
  groups: (string | null)[];
  executions: ExecutionMetrics[];
  effects: EffectMetrics[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {dimension ? dimensionLabels[dimension] : "Total"}
          </TableHead>
          <TableHead className="text-right">Executions</TableHead>
          <TableHead className="text-right">Started tasks</TableHead>
          <TableHead className="text-right">Failure rate</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Cost per task</TableHead>
          <TableHead className="text-right">Tokens</TableHead>
          <TableHead className="text-right">Average duration</TableHead>
          <TableHead className="text-right">Contributions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => {
          const row = executions.find(
            (candidate) => groupOf(candidate, dimension) === group
          );

          const effect = effects.find(
            (candidate) => groupOf(candidate, dimension) === group
          );

          return (
            <TableRow key={group ?? ""}>
              <TableCell>
                {dimension && (
                  <DimensionValue dimension={dimension} value={group} />
                )}
              </TableCell>
              <TableCell variant="numeric">{row?.executions ?? 0}</TableCell>
              <TableCell variant="numeric">{row?.startedTasks ?? 0}</TableCell>
              <TableCell variant="numeric">
                {rateLabel(row ? failureRate(row) : null)}
              </TableCell>
              <TableCell variant="numeric">
                {costLabel(row?.cost ?? 0)}
              </TableCell>
              <TableCell variant="numeric">
                {row?.startedTasks
                  ? costLabel(row.cost / row.startedTasks)
                  : "—"}
              </TableCell>
              <TableCell variant="numeric">
                {countLabel(row ? usageTokens(row) : 0)}
              </TableCell>
              <TableCell variant="numeric">
                {row && row.averageDuration !== null
                  ? durationLabel(row.averageDuration)
                  : "—"}
              </TableCell>
              <TableCell variant="numeric">{effect?.effects ?? 0}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
