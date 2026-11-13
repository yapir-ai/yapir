import type { ReactNode } from "react";

export function Occurrences({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div data-slot="occurrences" className="grid gap-1 text-xs">
      <span className="text-muted-foreground">{title}</span>
      <ul className="grid gap-0.5 tabular-nums">{children}</ul>
    </div>
  );
}

export function Occurrence({
  time,
  detail,
}: {
  time: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap gap-x-3">
      <span>{time}</span>
      {detail && <span className="text-muted-foreground">{detail}</span>}
    </li>
  );
}
