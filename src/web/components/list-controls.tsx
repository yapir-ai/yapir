import { useAppHotkeys, useHotkey } from "@tanstack/react-hotkeys";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { Shortcut } from "@web/components/shortcut";
import { Button } from "@web/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@web/components/ui/input-group";
import { ListFooter } from "@web/components/ui/list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import { Toggle } from "@web/components/ui/toggle";
import { listPageSize } from "@web/lib/lists/list.route";
import type { SoftDeleteListRouteSearch } from "@web/lib/lists/list.route";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { z } from "zod";

const searchDelay = 250;

function useListNavigate() {
  const navigate = useNavigate();

  return (
    search: Partial<z.output<typeof SoftDeleteListRouteSearch>>,
    replace = false
  ) => {
    void navigate({
      to: ".",
      search: (previous) => ({
        ...previous,
        offset: 0,
        ...search,
      }),
      replace,
    });
  };
}

export function ListToolbar({ children }: { children: ReactNode }) {
  return (
    <search className="flex flex-wrap items-center gap-2">{children}</search>
  );
}

export function ListSearch({ label, value }: { label: string; value: string }) {
  const navigate = useListNavigate();
  const input = useRef<HTMLInputElement>(null);
  const appHotkey = useAppHotkeys()["list.search"];
  const [text, setText] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  const navigateToSearch = useDebouncedCallback(
    (search: string) => navigate({ search }, true),
    { wait: searchDelay }
  );

  useHotkey(appHotkey, () => input.current?.focus());

  if (value !== previousValue) {
    setPreviousValue(value);
    setText(value);
  }

  return (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        ref={input}
        type="search"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          navigateToSearch(event.target.value.trim());
        }}
      />
      <InputGroupAddon align="inline-end">
        <Shortcut appHotkey={appHotkey} />
      </InputGroupAddon>
    </InputGroup>
  );
}

export function ListFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value?: T) => void;
}) {
  const items = [
    { value: null, label: `Any ${label.toLowerCase()}` },
    ...options,
  ];

  return (
    <Select
      items={items}
      value={value ?? null}
      onValueChange={(selected) => onChange(selected ?? undefined)}
    >
      <SelectTrigger aria-label={label} className="max-w-56">
        <SelectValue>
          {(selected: T | null): ReactNode =>
            options.find((option) => option.value === selected)?.label ?? label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        align="start"
        className="w-auto min-w-(--anchor-width)"
      >
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ShowDeletedFilter({ value }: { value: boolean }) {
  const navigate = useListNavigate();

  return (
    <Toggle
      variant="outline"
      pressed={value}
      onPressedChange={(pressed) => {
        navigate({ showDeleted: pressed });
      }}
    >
      <Trash2 aria-hidden="true" />
      Show deleted
    </Toggle>
  );
}

export function ListNoResults({
  noun,
  filters,
}: {
  noun: string;
  filters: string[];
}) {
  const navigate = useNavigate();

  return (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No matching {noun}</EmptyTitle>
        <EmptyDescription>
          No {noun} match {filters.join(", ")}.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          onClick={() => {
            void navigate({ to: ".", search: {} });
          }}
        >
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ListPagination({
  offset,
  shown,
  total,
  hasNext: hasNextPage,
  noun: [one, other],
}: {
  offset: number;
  shown: number;
  total?: number;
  hasNext?: boolean;
  noun: [one: string, other: string];
}) {
  const navigate = useListNavigate();

  const hasNext =
    hasNextPage ?? (total !== undefined && offset + shown < total);

  if (shown === 0) {
    return null;
  }

  if (offset === 0 && !hasNext) {
    return (
      <ListFooter>
        {shown} {shown === 1 ? one : other}
      </ListFooter>
    );
  }

  const range = `${offset + 1}–${offset + shown}`;

  return (
    <ListFooter>
      {total === undefined
        ? `${other[0]!.toUpperCase()}${other.slice(1)} ${range}`
        : `${range} of ${total} ${other}`}
      <nav aria-label="Pagination" className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0}
          onClick={() => {
            navigate({ offset: Math.max(0, offset - listPageSize) });
          }}
        >
          <ChevronLeft aria-hidden="true" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => {
            navigate({ offset: offset + listPageSize });
          }}
        >
          Next <ChevronRight aria-hidden="true" />
        </Button>
      </nav>
    </ListFooter>
  );
}
