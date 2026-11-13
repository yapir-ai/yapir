import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { cn } from "cn";
import type { ComponentProps } from "react";

const codeProps = {
  spellCheck: false,
  autoCapitalize: "off",
  autoCorrect: "off",
} as const;

export function Code(props: ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className="font-mono text-[0.9em] tabular-nums"
      {...props}
    />
  );
}

export function CodeInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <Input {...codeProps} className={cn("font-mono", className)} {...props} />
  );
}

export function CodeTextarea({
  className,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <Textarea
      {...codeProps}
      className={cn("font-mono", className)}
      {...props}
    />
  );
}
