import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@web/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@web/components/ui/sidebar";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

function useGroupOpen(label: string, active: boolean) {
  const storageKey = `yapir-sidebar-group-${label}`;

  const [open, setOpen] = useState(
    () => active || localStorage.getItem(storageKey) === "true"
  );

  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);

    if (active) {
      setOpen(true);
    }
  }

  function changeOpen(value: boolean) {
    localStorage.setItem(storageKey, String(value));
    setOpen(value);
  }

  return [open, changeOpen] as const;
}

export function NavigationGroup({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useGroupOpen(label, active);
  const { state } = useSidebar();

  return (
    <Collapsible
      open={open || state === "collapsed"}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel render={<CollapsibleTrigger />}>
          {label}
          <ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
        </SidebarGroupLabel>
        <CollapsibleContent>{children}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
