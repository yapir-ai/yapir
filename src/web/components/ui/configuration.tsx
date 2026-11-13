import { Button } from "@web/components/ui/button";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

export function ConfigurationSummary({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "border-border h-auto w-full justify-start gap-3 rounded-none border-0 border-b px-0 py-4 text-left font-normal whitespace-normal",
        className
      )}
      {...props}
    />
  );
}

export function ConfigurationMeta({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      {children}
    </span>
  );
}

export function ConfigurationTitle({ children }: { children: ReactNode }) {
  return <span className="block text-xs font-semibold">{children}</span>;
}

export function ConfigurationCode({ children }: { children: ReactNode }) {
  return (
    <code className="text-muted-foreground block truncate font-mono text-xs">
      {children}
    </code>
  );
}
