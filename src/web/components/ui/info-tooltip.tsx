import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export function InfoTooltip({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger aria-label={`About ${label}`}>
        <Info size={12} />
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
