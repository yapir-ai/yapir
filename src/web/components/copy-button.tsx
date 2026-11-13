import { Button } from "@web/components/ui/button";
import { useCopy } from "@web/hooks/use-copy";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ReactNode } from "react";

export function CopyButton({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const { copied, copy } = useCopy();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void copy(text);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : children}
    </Button>
  );
}
