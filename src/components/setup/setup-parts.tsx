"use client";

import {
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useReducedMotion } from "motion/react";

import { AppIcon } from "@/components/brand/marks";
import { TextMorph } from "@/components/ui/text-morph";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-messages";

/*
 * Small pieces of the setup flow: the step heading, the progress
 * segments, the live top-bar preview, and a password field with a
 * Show/Hide toggle and a length track.
 */

const subscribeNever = () => () => {};

/**
 * Whether to drop travel, read only after mount: the server cannot know
 * the visitor's setting, so the first render always matches it (the
 * pattern in ui/text-morph.tsx).
 */
export function useSetupReducedMotion(): boolean {
  const prefersReducedMotion = useReducedMotion();
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return mounted && prefersReducedMotion === true;
}

/** The title and one line of a step. Focusable, so focus can land on it. */
export function StepHeading({
  align = "center",
  description,
  title,
}: {
  align?: "center" | "start";
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "center" && "items-center text-center",
      )}
    >
      <h1
        className="text-[1.375rem] leading-7 font-semibold tracking-[-0.03em] text-balance text-(--fg) outline-none sm:text-2xl sm:leading-8"
        data-step-heading=""
        tabIndex={-1}
      >
        {title}
      </h1>
      {description ? (
        <p className="max-w-[24rem] text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Where the person is: one short segment per step, the current one longer
 * and in the accent, the ones behind in carbon. Decorative; the live
 * region says the same in words.
 */
export function ProgressSegments({
  count,
  current,
}: {
  count: number;
  current: number;
}) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <span
          className={cn(
            "h-1.5 rounded-full transition-[width,background-color] duration-(--spring-settle-dur) ease-(--spring-settle) motion-reduce:transition-[background-color]",
            index === current
              ? "w-6 bg-(--accent)"
              : index < current
                ? "w-1.5 bg-[rgb(var(--fg-rgb)/0.32)]"
                : "w-1.5 bg-[rgb(var(--fg-rgb)/0.12)]",
          )}
          key={index}
        />
      ))}
    </div>
  );
}

/**
 * The top of the app as it will look with this name in it, drawn small,
 * so the name the person types lands somewhere real as they type it.
 */
export function TopBarPreview({ name }: { name: string }) {
  const trimmed = name.trim();

  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2 rounded-(--radius-well) bg-(--surface) p-2.5"
    >
      <div className="flex h-11 items-center gap-2.5 rounded-[0.75rem] bg-(--paper) px-3 shadow-[var(--ring-faint),0_1px_2px_rgb(var(--fg-rgb)/0.06)]">
        <AppIcon className="size-6 shrink-0" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[0.8125rem] leading-5 font-semibold tracking-[-0.01em] transition-colors duration-(--dur-hover) ease-(--ease-out)",
            trimmed ? "text-(--fg)" : "text-(--placeholder)",
          )}
        >
          {trimmed || "Your organization"}
        </span>
        <span className="hidden h-6 items-center rounded-full bg-(--surface-strong) px-2.5 text-[0.6875rem] font-medium text-(--secondary-strong) min-[400px]:inline-flex">
          Documents
        </span>
        <span className="size-6 shrink-0 rounded-full bg-(--accent-soft)" />
      </div>
      <p className="px-1 text-xs leading-4 text-(--secondary)">
        Shown at the top of every page and in every email.
      </p>
    </div>
  );
}

/**
 * A new password: a Show/Hide toggle inside the field, and a thin track
 * that fills toward the minimum length and turns green once it is met.
 */
export function PasswordInput({
  value,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "value"> & { value: string }) {
  const [visible, setVisible] = useState(false);
  const length = value.length;
  const progress = Math.min(1, length / PASSWORD_MIN_LENGTH);
  const enough = length >= PASSWORD_MIN_LENGTH;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          {...props}
          className="pr-16"
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-pressed={visible}
          className="absolute inset-y-1.5 right-1.5 inline-flex min-w-12 items-center justify-center rounded-[0.625rem] px-2.5 text-[0.8125rem] font-medium text-(--secondary-strong) outline-none transition-[background-color,color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) active:bg-(--press)"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <span className="sr-only">
            {visible ? "Hide password" : "Show password"}
          </span>
          <span aria-hidden="true">
            <TextMorph>{visible ? "Hide" : "Show"}</TextMorph>
          </span>
        </button>
      </div>
      <span
        aria-hidden="true"
        className="h-1 overflow-hidden rounded-full bg-(--track)"
      >
        <span
          className={cn(
            "block h-full origin-left rounded-full transition-[scale,background-color] duration-(--dur-move) ease-(--ease-out)",
            enough ? "bg-(--success-dot)" : "bg-(--accent)",
          )}
          style={{ scale: `${String(progress)} 1` }}
        />
      </span>
    </div>
  );
}
