import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

const statusVariants = cva(
  "inline-flex items-center gap-1.5 font-medium tabular-nums [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        muted: "text-muted-foreground",
        info: "text-info",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
      },
      live: { true: "[&_svg]:motion-safe:animate-pulse" },
      size: {
        default: "text-xs [&_svg]:size-3.5",
        lg: "h-7 rounded-md border border-current/25 bg-current/8 px-2.5 text-xs [&_svg]:size-3.5",
      },
    },
    defaultVariants: { size: "default" },
  }
);

export function Status({
  tone,
  live,
  size,
  className,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof statusVariants>) {
  return (
    <span
      data-slot="status"
      className={cn(statusVariants({ tone, live, size }), className)}
      {...props}
    />
  );
}
