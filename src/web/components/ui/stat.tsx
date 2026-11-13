import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

import { InfoTooltip } from "./info-tooltip";

export function StatList({ className, ...props }: ComponentProps<"dl">) {
  return (
    <dl
      data-slot="stat-list"
      className={cn("grid grid-cols-4 gap-4", className)}
      {...props}
    />
  );
}

export function Stat({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div data-slot="stat" className="grid gap-1">
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        {label}
        {description && <InfoTooltip label={label} description={description} />}
      </dt>
      <dd className="font-heading text-xl font-medium tabular-nums">
        {children}
      </dd>
    </div>
  );
}
