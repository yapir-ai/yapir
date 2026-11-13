import { formatForDisplay, isHotkeySequence } from "@tanstack/react-hotkeys";
import type { AppHotkey } from "@tanstack/react-hotkeys";
import { Kbd, KbdGroup } from "@web/components/ui/kbd";

export function Shortcut({ appHotkey }: { appHotkey: AppHotkey }) {
  const { hotkey } = appHotkey;

  if (!hotkey) {
    return null;
  }

  const steps = isHotkeySequence(hotkey) ? hotkey : [hotkey];

  return (
    <KbdGroup>
      {steps.map((step) => (
        <Kbd key={formatForDisplay(step)}>{formatForDisplay(step)}</Kbd>
      ))}
    </KbdGroup>
  );
}
