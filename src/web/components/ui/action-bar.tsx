import type { ReactNode } from "react";

export function ActionBar({
  status,
  alert,
  children,
}: {
  status: ReactNode;
  alert?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="action-bar"
      role="region"
      aria-label="Form actions"
      className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-2 sticky bottom-4 z-10 grid gap-2 rounded-xl p-2 shadow-lg ring-1 duration-200 ease-out motion-reduce:animate-none"
    >
      {alert}
      <div className="flex items-center justify-between gap-4 pl-2">
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <span
            aria-hidden="true"
            className="bg-primary size-1.5 rounded-full"
          />
          {status}
        </span>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
