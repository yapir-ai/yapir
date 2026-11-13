import { FormSection } from "@web/components/ui/form-section";
import type { ReactNode } from "react";

export function DangerZone({ children }: { children: ReactNode }) {
  return (
    <FormSection title="Danger zone">
      <div
        data-slot="danger-zone"
        className="border-destructive/30 divide-destructive/30 divide-y rounded-xl border"
      >
        {children}
      </div>
    </FormSection>
  );
}

export function DangerZoneItem({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs leading-5 text-pretty">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
