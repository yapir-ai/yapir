import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

export function Properties({
  title,
  className,
  children,
  ...props
}: ComponentProps<"section"> & { title: string }) {
  return (
    <section
      data-slot="properties"
      className={cn("grid gap-1.5", className)}
      {...props}
    >
      <h2 className="text-muted-foreground text-xs font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function PropertyList({ className, ...props }: ComponentProps<"dl">) {
  return (
    <dl
      data-slot="property-list"
      className={cn(
        "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs",
        className
      )}
      {...props}
    />
  );
}

export function PropertyText({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="property-text"
      className={cn("text-xs leading-5 tabular-nums", className)}
      {...props}
    />
  );
}

export function Property({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground truncate leading-5">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 leading-5 tabular-nums [&>*]:min-w-0 [&>*]:truncate">
        {children}
      </dd>
    </>
  );
}
