import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

const itemVariants = cva(
  "relative flex scroll-mt-4 items-start justify-between gap-4 py-1.5 text-sm",
  {
    variants: {
      variant: { default: "pl-5", outline: "pl-5", nested: "pl-10" },
      highlighted: { true: "bg-muted" },
    },
    defaultVariants: { variant: "default" },
  }
);

const markerVariants = cva(
  "absolute top-4 left-[-0.5px] -translate-x-1/2 -translate-y-1/2 rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary size-2.5",
        outline: "border-muted-foreground bg-background size-2.5 border-2",
        nested: "bg-muted-foreground size-1.5",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Timeline(props: ComponentProps<"ol">) {
  return <ol className="border-border ml-1.5 grid border-l" {...props} />;
}

export function TimelineItem({
  id,
  variant,
  highlighted,
  time,
  children,
}: VariantProps<typeof itemVariants> & {
  id?: string;
  time?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li id={id} className={itemVariants({ variant, highlighted })}>
      <span aria-hidden="true" className={markerVariants({ variant })} />
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1">{children}</div>
      <span className="leading-5">{time}</span>
    </li>
  );
}

export function TimelineLabel(props: ComponentProps<"span">) {
  return <span className="font-medium" {...props} />;
}

export function TimelineQuote(props: ComponentProps<"blockquote">) {
  return (
    <blockquote
      className="text-muted-foreground border-border line-clamp-3 border-l-2 pl-2 whitespace-pre-line"
      {...props}
    />
  );
}
