import { useHotkey } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import { Button } from "@web/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandItemDescription,
  CommandItemLink,
  CommandList,
  CommandShortcut,
} from "@web/components/ui/command";
import { defaultFilter } from "cmdk";
import { Search } from "lucide-react";
import { useState } from "react";

import { appHotkeys } from "./app-hotkeys";
import { addRecentId, readRecentIds } from "./recent";
import { useCommandPaletteGroups } from "./use-command-palette-groups";
import type { CommandPaletteItem } from "./use-command-palette-groups";

const recentStorageKey = "yapir-command-palette-recent";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useHotkey(appHotkeys["palette.open"], () => setOpen(!open));

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Search />
        Search
        <Shortcut appHotkey={appHotkeys["palette.open"]} />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Command palette"
        description="Search for a page, a resource or an action."
        className="sm:max-w-xl"
      >
        <CommandPaletteContent onRun={() => setOpen(false)} />
      </CommandDialog>
    </>
  );
}

function CommandPaletteContent({ onRun }: { onRun: () => void }) {
  const groups = useCommandPaletteGroups();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const recentIds = readRecentIds(recentStorageKey);

  const items = new Map(
    groups.flatMap(({ items: groupItems }) =>
      groupItems.map((item) => [item.id, item] as const)
    )
  );

  const recent = recentIds.flatMap((id) => items.get(id) ?? []);

  function close(item: CommandPaletteItem) {
    localStorage.setItem(
      recentStorageKey,
      JSON.stringify(addRecentId(recentIds, item.id))
    );
    onRun();
  }

  function run(item: CommandPaletteItem) {
    close(item);
    void ("link" in item ? navigate(item.link) : item.run());
  }

  return (
    <Command
      filter={(_value, query, keywords = []) =>
        defaultFilter(keywords.join(" "), query)
      }
    >
      <CommandInput
        placeholder="Search pages, resources and actions…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-96">
        <CommandEmpty>No results.</CommandEmpty>
        {!search && recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((item) => (
              <CommandPaletteEntry
                key={item.id}
                value={`recent:${item.id}`}
                item={item}
                onSelect={run}
                onFollow={close}
              />
            ))}
          </CommandGroup>
        )}
        {groups.map(({ heading, items: groupItems }) => (
          <CommandGroup key={heading} heading={heading}>
            {groupItems.map((item) => (
              <CommandPaletteEntry
                key={item.id}
                value={item.id}
                item={item}
                onSelect={run}
                onFollow={close}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

function CommandPaletteEntry({
  value,
  item,
  onSelect,
  onFollow,
}: {
  value: string;
  item: CommandPaletteItem;
  onSelect: (item: CommandPaletteItem) => void;
  onFollow: (item: CommandPaletteItem) => void;
}) {
  const { icon, label, project, appHotkey } = item;

  return (
    <CommandItem
      value={value}
      keywords={project ? [label, project] : [label]}
      onSelect={() => onSelect(item)}
    >
      {icon}
      {"link" in item ? (
        <CommandItemLink
          {...item.link}
          onClick={(event) => {
            event.stopPropagation();
            onFollow(item);
          }}
        >
          {label}
        </CommandItemLink>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      {project && <CommandItemDescription>{project}</CommandItemDescription>}
      {appHotkey && (
        <CommandShortcut>
          <Shortcut appHotkey={appHotkey} />
        </CommandShortcut>
      )}
    </CommandItem>
  );
}
