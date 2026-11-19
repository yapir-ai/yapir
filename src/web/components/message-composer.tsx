import { useFormatForDisplay } from "@tanstack/react-hotkeys";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@web/components/ui/input-group";
import { Kbd } from "@web/components/ui/kbd";
import { ArrowUp, Square } from "lucide-react";
import { useState } from "react";

export function MessageComposer({
  placeholder,
  busy = false,
  submitKey = "enter",
  autoFocus,
  onSend,
  onStop,
}: {
  placeholder: string;
  busy?: boolean;
  submitKey?: "enter" | "mod+enter";
  autoFocus?: boolean;
  onSend: (text: string) => Promise<void>;
  onStop?: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const formatForDisplay = useFormatForDisplay();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (busy || !text.trim()) {
          return;
        }

        setText("");
        void onSend(text);
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          aria-label="Message"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            const submits =
              submitKey === "enter"
                ? !event.shiftKey
                : event.metaKey || event.ctrlKey;

            if (event.key === "Enter" && submits) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end">
          {submitKey === "mod+enter" && (
            <Kbd aria-label={`${formatForDisplay("Mod+Enter")} to send`}>
              {formatForDisplay("Mod+Enter")}
            </Kbd>
          )}
          {busy && onStop ? (
            <InputGroupButton
              size="icon-xs"
              aria-label="Stop"
              className="ml-auto"
              onClick={() => {
                void onStop();
              }}
            >
              <Square />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-xs"
              aria-label="Send"
              className="ml-auto"
              disabled={!text.trim()}
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
