import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@web/components/ui/collapsible";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

const disclosureVariants = cva("group/disclosure bg-card rounded-xl border", {
  variants: {
    tone: {
      default: "",
      destructive: "border-destructive/40",
      info: "border-info/40",
    },
  },
  defaultVariants: { tone: "default" },
});

export function Disclosure({
  className,
  tone,
  ...props
}: ComponentProps<typeof Collapsible> &
  VariantProps<typeof disclosureVariants>) {
  return (
    <Collapsible
      data-slot="disclosure"
      className={cn(disclosureVariants({ tone }), className)}
      {...props}
    />
  );
}

export function DisclosureHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="disclosure-header"
      className={cn(
        "hover:bg-muted/50 flex items-center gap-3 pr-3 text-sm transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function DisclosureTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger
      data-slot="disclosure-trigger"
      className={cn(
        "focus-visible:ring-ring/50 flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2.5 pl-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset",
        className
      )}
      {...props}
    >
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-out group-data-open/disclosure:rotate-90 motion-reduce:transition-none"
      />
      {children}
    </CollapsibleTrigger>
  );
}

export function DisclosureSummary({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="disclosure-summary"
      className={cn(
        "text-muted-foreground min-w-0 truncate text-xs",
        className
      )}
      {...props}
    />
  );
}

export function DisclosureMeta({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="disclosure-meta"
      className={cn(
        "text-muted-foreground ml-auto shrink-0 text-xs tabular-nums",
        className
      )}
      {...props}
    />
  );
}

export function DisclosureContent({
  className,
  ...props
}: ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="disclosure-content"
      className={cn("border-t px-4 py-3", className)}
      {...props}
    />
  );
}
