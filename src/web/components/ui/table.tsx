import { createLink } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import * as React from "react";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-clip"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-xs", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:hover:bg-transparent", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted relative border-b transition-colors [&_:is(button,a:not([data-slot=table-row-link]))]:relative",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "bg-background text-muted-foreground sticky top-(--app-header-height) z-10 h-8 px-3 text-left align-middle font-medium whitespace-nowrap shadow-[inset_0_-1px_0_var(--color-border)] [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

const tableCellVariants = cva(
  "h-10 px-3 py-1.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
  {
    variants: {
      variant: {
        default: "",
        muted: "text-muted-foreground",
        numeric: "text-muted-foreground text-right tabular-nums",
      },
      grow: {
        true: "w-full max-w-0 truncate",
        false: "",
      },
    },
    defaultVariants: { variant: "default", grow: false },
  }
);

function TableCell({
  className,
  variant,
  grow,
  ...props
}: React.ComponentProps<"td"> & VariantProps<typeof tableCellVariants>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(tableCellVariants({ variant, grow }), className)}
      {...props}
    />
  );
}

function TableRowLinkAnchor({
  className,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="table-row-link"
      className={cn(
        "focus-visible:after:ring-ring/50 font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset",
        className
      )}
      {...props}
    />
  );
}

const TableRowLink = createLink(TableRowLinkAnchor);

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-xs", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableRowLink,
  TableCell,
  TableCaption,
};
