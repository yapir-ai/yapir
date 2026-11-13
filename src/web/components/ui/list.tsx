import { cn } from "cn";
import type { ComponentProps } from "react";

export function ListFooter({ className, ...props }: ComponentProps<"footer">) {
  return (
    <footer
      data-slot="list-footer"
      className={cn(
        "text-muted-foreground flex min-h-7 items-center justify-between gap-4 text-xs tabular-nums",
        className
      )}
      {...props}
    />
  );
}
