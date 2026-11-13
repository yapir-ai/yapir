import { code } from "@streamdown/code";
import { cn } from "cn";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";

const plugins = { code };

export function Markdown({
  className,
  ...props
}: ComponentProps<typeof Streamdown>) {
  return (
    <Streamdown
      className={cn(
        "size-full text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={plugins}
      {...props}
    />
  );
}
