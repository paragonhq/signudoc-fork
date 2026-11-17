import { cn } from "@/lib/cn";
import { formatReminderInterval } from "@/lib/services/reminders";

type ReviewScheduleProps = {
  /** "Tue, 1 Dec 2026", or null before the browser knows today. */
  deadlineDate: string | null;
  deadlineDays: number;
  /** "Riley". */
  firstSignerName: string;
  reminderDays: number | null;
};

/**
 * What happens once it is sent, as three stops on one quiet line: the
 * email goes out today, reminders follow (or not), and the links stop
 * working at the deadline. It follows the two selects above it as they
 * change. On a phone the stops stack.
 */
export function ReviewSchedule({
  deadlineDate,
  deadlineDays,
  firstSignerName,
  reminderDays,
}: ReviewScheduleProps) {
  const stops = [
    {
      detail: `${firstSignerName} gets the email`,
      label: "Today",
      tone: "now" as const,
    },
    reminderDays === null
      ? {
          detail: "You can still nudge them yourself",
          label: "No reminders",
          tone: "off" as const,
        }
      : {
          detail: "A reminder to whoever’s turn it is",
          label: formatReminderInterval(reminderDays),
          tone: "later" as const,
        },
    {
      detail: "Signing links stop working",
      label: deadlineDate ?? `In ${String(deadlineDays)} days`,
      tone: "later" as const,
    },
  ];

  return (
    <ol
      aria-label="After you send"
      className="relative grid gap-3 sm:grid-cols-3 sm:gap-4"
    >
      {/* The line the stops sit on (desktop). */}
      <span
        aria-hidden="true"
        className="absolute top-[0.3125rem] right-[16.66%] left-1 hidden h-px bg-(--divider) sm:block"
      />
      {stops.map((stop, index) => (
        <li className="relative flex gap-3 sm:flex-col sm:gap-2.5" key={index}>
          <span
            aria-hidden="true"
            className={cn(
              "relative mt-1.5 size-2.5 shrink-0 rounded-full sm:mt-0",
              stop.tone === "now"
                ? "bg-(--accent) shadow-[0_0_0_4px_rgb(var(--accent-rgb)/0.14)]"
                : stop.tone === "off"
                  ? "bg-(--paper) shadow-[inset_0_0_0_1.5px_var(--placeholder)]"
                  : "bg-(--paper) shadow-[inset_0_0_0_1.5px_var(--secondary)]",
            )}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                "text-[0.8125rem] leading-5 font-medium tabular-nums",
                stop.tone === "off" ? "text-(--secondary)" : "text-(--fg)",
              )}
            >
              {stop.label}
            </span>
            <span className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
              {stop.detail}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
