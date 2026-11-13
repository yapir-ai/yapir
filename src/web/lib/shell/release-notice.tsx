import { Link } from "@tanstack/react-router";
import { Badge } from "@web/components/ui/badge";
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@web/components/ui/sidebar";
import { Sparkles } from "lucide-react";
import { useState } from "react";

const storageKey = "yapir-seen-release";

export function ReleaseNotice() {
  const [seenRelease, setSeenRelease] = useState(() =>
    localStorage.getItem(storageKey)
  );

  if (seenRelease === __APP_RELEASE__) {
    return (
      <SidebarGroupLabel
        className="justify-center"
        render={<Link to="/changelog" />}
      >
        {__APP_VERSION__}
      </SidebarGroupLabel>
    );
  }

  function markSeen() {
    localStorage.setItem(storageKey, __APP_RELEASE__);
    setSeenRelease(__APP_RELEASE__);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={`What’s new in ${__APP_RELEASE__}`}
          render={<Link to="/changelog" onClick={markSeen} />}
        >
          <Sparkles />
          <span>What&rsquo;s new in {__APP_RELEASE__}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge>
          <Badge variant="secondary">New</Badge>
        </SidebarMenuBadge>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
