import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-slot="form-section"
      className="grid gap-x-12 gap-y-4 border-t py-8 first:border-t-0 first:pt-2 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-xs leading-5 text-pretty">
            {description}
          </p>
        )}
      </div>
      <div className="grid min-w-0 content-start gap-6 *:min-w-0">
        {children}
      </div>
    </section>
  );
}

export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="form-footer"
      className="grid gap-x-12 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
    >
      <div className="grid gap-4 md:col-start-2">{children}</div>
    </div>
  );
}
