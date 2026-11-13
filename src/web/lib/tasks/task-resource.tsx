import { Link } from "@web/components/ui/link";
import { ProviderIcon } from "@web/components/ui/provider-icon";
import type { ComponentProps } from "react";

export function TaskResource({
  provider,
  host,
  label,
  url,
  variant,
}: {
  provider: string;
  host: string;
  label: string;
  url?: string;
  variant?: ComponentProps<typeof Link>["variant"];
}) {
  const content = (
    <span
      title={`${host} · ${label}`}
      className="inline-flex max-w-full items-center gap-1.5 [&_svg]:shrink-0"
    >
      <ProviderIcon provider={provider} />
      <span className="truncate">{label}</span>
    </span>
  );

  return url ? (
    <Link variant={variant} to={url} target="_blank" rel="noreferrer">
      {content}
    </Link>
  ) : (
    content
  );
}
