import { cn } from "cn";
import type { ComponentProps } from "react";

function AppHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="app-header"
      className={cn(
        "bg-background sticky top-0 z-10 flex h-(--app-header-height) shrink-0 items-center gap-2 px-4",
        className
      )}
      {...props}
    />
  );
}

export { AppHeader };
