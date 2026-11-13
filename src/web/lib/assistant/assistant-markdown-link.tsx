import { useRouter } from "@tanstack/react-router";
import { Link } from "@web/components/ui/link";
import type { ComponentProps } from "react";

import { useCurrentAssistantChat } from "./assistant-chat";
import { isRoutePath } from "./assistant-page-map";

export function AssistantMarkdownLink({
  href = "",
  children,
}: ComponentProps<"a">) {
  const router = useRouter();
  const { setDockOpen } = useCurrentAssistantChat();
  const url = new URL(href, window.location.origin);

  if (
    url.origin !== window.location.origin ||
    !isRoutePath(router, url.pathname)
  ) {
    return <span>{children}</span>;
  }

  return (
    <Link to={href} onClick={() => setDockOpen(true)}>
      {children}
    </Link>
  );
}
