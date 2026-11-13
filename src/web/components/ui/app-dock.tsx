import { cn } from "cn";
import type { ComponentProps } from "react";

function AppDock({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      data-slot="app-dock"
      className={cn(
        "sticky top-0 z-60 flex h-svh w-(--app-dock-width) shrink-0 p-2",
        className
      )}
      {...props}
    />
  );
}

export { AppDock };
