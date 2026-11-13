import { isValidCron } from "@server/lib/schedules/schedule.trigger";
import { Occurrence, Occurrences } from "@web/components/ui/occurrences";
import { Cron } from "croner";

const utcFormat = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
  timeZoneName: "short",
});

const localFormat = new Intl.DateTimeFormat("en", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

const isLocalUtc =
  localFormat.resolvedOptions().timeZone ===
  utcFormat.resolvedOptions().timeZone;

export function CronNextRuns({ pattern }: { pattern: string }) {
  if (!isValidCron(pattern)) {
    return null;
  }

  return (
    <Occurrences title="Next runs">
      {new Cron(pattern, { timezone: "UTC" }).nextRuns(3).map((run) => (
        <Occurrence
          key={run.getTime()}
          time={utcFormat.format(run)}
          detail={isLocalUtc ? undefined : `${localFormat.format(run)} local`}
        />
      ))}
    </Occurrences>
  );
}
