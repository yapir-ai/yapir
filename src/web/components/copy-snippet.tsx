import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@web/components/ui/input-group";
import { useCopy } from "@web/hooks/use-copy";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps } from "react";

export function CopySnippet({
  code,
  ...props
}: { code: string } & ComponentProps<typeof InputGroupInput>) {
  const { copied, copy } = useCopy();

  return (
    <InputGroup>
      <InputGroupInput {...props} readOnly value={code} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Copy"
          title="Copy"
          size="icon-xs"
          onClick={() => {
            void copy(code);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
