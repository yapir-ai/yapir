import { createLink } from "@tanstack/react-router";
import { buttonVariants } from "@web/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps } from "react";

function OpenLinkAnchor({
  className,
  children,
  ...props
}: Omit<ComponentProps<"a">, "aria-label"> & { "aria-label": string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            data-slot="open-link"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              className
            )}
            {...props}
          />
        }
      >
        <ArrowUpRight aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{props["aria-label"]}</TooltipContent>
    </Tooltip>
  );
}

export const OpenLink = createLink(OpenLinkAnchor);
