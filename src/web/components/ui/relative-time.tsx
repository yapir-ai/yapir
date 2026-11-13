import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";

const relativeFormat = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "short",
});

const absoluteFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const units = [
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
] as const;

const month = 30 * 86_400;

function relativeLabel(date: Date) {
  const seconds = (date.getTime() - Date.now()) / 1000;

  if (Math.abs(seconds) >= month) {
    return date.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
  }

  const [unit, duration] =
    units.find(([, length]) => Math.abs(seconds) >= length) ?? units[3];

  return relativeFormat.format(Math.round(seconds / duration), unit);
}

export function RelativeTime({ date }: { date: string | Date }) {
  const value = new Date(date);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <time
            dateTime={value.toISOString()}
            className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums"
          />
        }
      >
        {relativeLabel(value)}
      </TooltipTrigger>
      <TooltipContent>{absoluteFormat.format(value)}</TooltipContent>
    </Tooltip>
  );
}
