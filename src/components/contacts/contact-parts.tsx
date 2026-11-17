import { getInitials } from "@/components/ui/avatar";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { cn } from "@/lib/cn";
import { describeStatusMix, type ContactStatusMix } from "@/lib/contact-words";

/** The same person always gets the same soft colour. */
function paletteFor(email: string) {
  let hash = 0;

  for (const char of email.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return getSignerPalette(hash % 4);
}

const SIZES = {
  lg: "size-10 text-[0.8125rem]",
  md: "size-8 text-xs",
  xl: "size-14 text-lg",
} as const;

/** A contact's initials on a soft tint chosen by their address. */
export function ContactAvatar({
  className,
  email,
  name,
  size = "lg",
}: {
  className?: string;
  email: string;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const palette = paletteFor(email);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-[0.01em] select-none",
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: palette.tint,
        color: `color-mix(in oklab, ${palette.color} 78%, var(--fg))`,
      }}
    >
      {getInitials(name)}
    </span>
  );
}

const MIX_PARTS: {
  className: string;
  key: keyof ContactStatusMix;
}[] = [
  { className: "bg-(--success-dot)", key: "completed" },
  { className: "bg-(--warning-dot)", key: "waiting" },
  { className: "bg-(--danger)", key: "declined" },
  { className: "bg-(--dot-neutral)", key: "ended" },
  { className: "bg-(--track)", key: "draft" },
];

/**
 * Where their documents stand, as one short bar: completed in green,
 * waiting in amber, declined in red, the rest grey. The words are given
 * to screen readers (and in the tray); the bar is a glance.
 */
export function StatusMixBar({
  className,
  mix,
}: {
  className?: string;
  mix: ContactStatusMix;
}) {
  const sent = mix.completed + mix.waiting + mix.declined + mix.ended;

  // Drafts alone say nothing about how things stand: no bar.
  if (sent === 0) {
    return null;
  }

  return (
    <span
      aria-label={describeStatusMix(mix)}
      className={cn(
        "flex h-1.5 w-14 gap-0.5 overflow-hidden rounded-full",
        className,
      )}
      role="img"
    >
      {MIX_PARTS.filter((part) => mix[part.key] > 0).map((part) => (
        <span
          className={cn("h-full rounded-full", part.className)}
          key={part.key}
          style={{ flexGrow: mix[part.key] }}
        />
      ))}
    </span>
  );
}
