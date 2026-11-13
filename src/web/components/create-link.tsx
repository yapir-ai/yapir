import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { createLink, useNavigate } from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

function CreateAnchor({ children, ...props }: ComponentProps<"a">) {
  const navigate = useNavigate();
  const appHotkey = useAppHotkeys()["list.create"];

  useHotkey(appHotkey, () => {
    void navigate({ href: props.href });
  });

  return (
    <Tooltip>
      <TooltipTrigger render={<a {...props} />}>
        <Plus aria-hidden="true" />
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {children}
        <Shortcut appHotkey={appHotkey} />
      </TooltipContent>
    </Tooltip>
  );
}

export const CreateLink = createLink(CreateAnchor);
