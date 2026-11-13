import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

const pageVariants = cva("mx-auto flex w-full flex-1 flex-col", {
  variants: {
    width: { wide: "max-w-6xl gap-4", narrow: "max-w-3xl gap-6" },
  },
  defaultVariants: { width: "narrow" },
});

export function Page({
  className,
  width,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof pageVariants>) {
  return (
    <div
      data-slot="page"
      className={cn(pageVariants({ width, className }))}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  icon,
  badge,
  description,
  children,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex min-h-8 items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-balance">
          {icon}
          {title}
          {badge}
        </h1>
        {description && <PageDescription>{description}</PageDescription>}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </header>
  );
}

function PageDescription({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground text-sm text-pretty">{children}</div>
  );
}

export function PageSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
