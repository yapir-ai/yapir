import { Link } from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import { useTheme } from "@web/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import {
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@web/components/ui/item";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@web/components/ui/sidebar";
import { authClient } from "@web/lib/auth/auth-client";
import { useSessionUser } from "@web/lib/auth/session";
import { UserAvatar } from "@web/lib/users/user-avatar";
import { ChevronsUpDown, Keyboard, LogOut } from "lucide-react";

import { appHotkeys } from "./app-hotkeys";
import { pages } from "./navigation";
import { shortcutsDialog } from "./shortcuts-dialog";

export function NavUser() {
  const user = useSessionUser();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();

  const identity = (
    <>
      <UserAvatar seed={user.email} image={user.image} />
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <span className="block truncate">{user.name}</span>
        </ItemTitle>
        <ItemDescription>
          <span className="block truncate">{user.email}</span>
        </ItemDescription>
      </ItemContent>
    </>
  );

  function signOut() {
    void authClient.signOut({
      fetchOptions: { onSuccess: () => window.location.reload() },
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            {identity}
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">{identity}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to={pages.apiKeys.to} />}>
              <pages.apiKeys.icon />
              {pages.apiKeys.label}
              <DropdownMenuShortcut>
                <Shortcut appHotkey={pages.apiKeys.appHotkey} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => shortcutsDialog.open(null)}>
              <Keyboard />
              Keyboard shortcuts
              <DropdownMenuShortcut>
                <Shortcut appHotkey={appHotkeys["shortcuts.open"]} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
