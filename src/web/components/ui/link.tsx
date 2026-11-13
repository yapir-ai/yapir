import { createLink } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

const linkVariants = cva("underline-offset-4 hover:underline", {
  variants: {
    variant: {
      default: "text-primary font-medium",
      muted: "text-muted-foreground hover:text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

function TextLink({
  className,
  variant,
  children,
  ...props
}: ComponentProps<"a"> & VariantProps<typeof linkVariants>) {
  return (
    <a className={cn(linkVariants({ variant }), className)} {...props}>
      {children}
    </a>
  );
}

export const Link = createLink(TextLink);
