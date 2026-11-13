import { Badge } from "@web/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@web/components/ui/card";
import { InfoTooltip } from "@web/components/ui/info-tooltip";
import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  count,
  action,
  children,
}: {
  title: string;
  description?: string;
  count?: number | string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {description && (
            <InfoTooltip label={title} description={description} />
          )}
          {count ? <Badge variant="secondary">{count}</Badge> : undefined}
        </div>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
