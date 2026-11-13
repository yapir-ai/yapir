import {
  HotkeysProvider,
  useAppHotkeyList,
  useHotkey,
} from "@tanstack/react-hotkeys";
import type { AppHotkeyListItem } from "@tanstack/react-hotkeys";
import { Shortcut } from "@web/components/shortcut";
import {
  createDialogHandle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@web/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@web/components/ui/item";

import { appHotkeys } from "./app-hotkeys";

export const shortcutsDialog = createDialogHandle();

const columns = [["Project", "General", "Lists"], ["Navigation"]];

export function ShortcutsDialog() {
  useHotkey(appHotkeys["shortcuts.open"], () => shortcutsDialog.open(null));

  return (
    <Dialog handle={shortcutsDialog}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <HotkeysProvider scope="shortcuts-dialog" exclusive>
          <ShortcutsDialogContent />
        </HotkeysProvider>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutsDialogContent() {
  const groups = new Map<string, AppHotkeyListItem[]>();

  for (const item of useAppHotkeyList()) {
    const group = item.appHotkey.meta?.group ?? "";
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }

  useHotkey(appHotkeys["shortcuts.open"], () => shortcutsDialog.close());

  return (
    <>
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Single-key shortcuts do not work while you type in a field.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-8">
        {columns.map((column) => (
          <div key={column.join(",")} className="flex flex-col gap-4">
            {column.map((group) => {
              const items = groups.get(group);

              return (
                items && (
                  <section key={group} className="flex flex-col gap-2">
                    <ItemDescription>{group}</ItemDescription>
                    <ItemGroup>
                      {items.map(({ appHotkey }) => (
                        <Item key={appHotkey.id} size="xs" role="listitem">
                          <ItemContent>
                            <ItemTitle>{appHotkey.meta?.name}</ItemTitle>
                          </ItemContent>
                          <ItemActions>
                            <Shortcut appHotkey={appHotkey} />
                          </ItemActions>
                        </Item>
                      ))}
                    </ItemGroup>
                  </section>
                )
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
