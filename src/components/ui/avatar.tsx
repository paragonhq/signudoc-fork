import * as React from "react";

import { cn } from "@/lib/cn";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { FlagGlyph, type StatusFlagGlyph } from "@/components/ui/status-flag";

/** Up to two initials from a name, or the first letter of an email. */
export function getInitials(nameOrEmail: string | null | undefined) {
  const source = (nameOrEmail ?? "").trim();

  if (!source) {
    return "?";
  }

  if (!source.includes(" ") && source.includes("@")) {
    return source[0]!.toUpperCase();
  }

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_SIZES = {
  xs: "size-5 text-[0.5625rem]",
  sm: "size-6 text-[0.625rem]",
  md: "size-8 text-xs",
  lg: "size-10 text-[0.8125rem]",
} as const;

type AvatarTone = "ink" | "accent" | "neutral";

const AVATAR_TONES: Record<AvatarTone, string> = {
  accent: "bg-(--accent-soft) text-(--accent-ink)",
  ink: "bg-(--surface-strong) text-(--fg)",
  neutral: "bg-(--surface) text-(--secondary)",
};

type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Name (or email) the initials come from. */
  name: string | null | undefined;
  size?: keyof typeof AVATAR_SIZES;
  tone?: AvatarTone;
};

/**
 * Initials in a circle, with an inner ring and a faint top highlight
 * (globals.css, "Avatars"). Side by side in a stack, each wears a paper rim
 * and a contact shadow, and the stack spreads a little on hover. Decorative by default (the name is written next to
 * it); pass `aria-label` when it stands alone.
 */
function Avatar({
  className,
  name,
  size = "md",
  tone = "ink",
  ...props
}: AvatarProps) {
  return (
    <span
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-[0.01em] select-none",
        AVATAR_SIZES[size],
        AVATAR_TONES[tone],
        className,
      )}
      data-slot="avatar"
      role={props["aria-label"] ? "img" : undefined}
      {...props}
    >
      {getInitials(name)}
    </span>
  );
}

export type SignerState = "waiting" | "viewed" | "signed" | "declined";

const SIGNER_STATE: Record<
  SignerState,
  { badge: string; glyph: StatusFlagGlyph; label: string; text: string }
> = {
  declined: {
    badge: "bg-(--danger-solid) text-(--on-accent)",
    glyph: "x",
    label: "Declined",
    text: "text-(--danger)",
  },
  signed: {
    badge: "bg-(--success) text-(--on-accent)",
    glyph: "check",
    label: "Signed",
    text: "text-(--success)",
  },
  viewed: {
    badge: "bg-(--accent) text-(--on-accent)",
    glyph: "ring",
    label: "Viewed",
    text: "text-(--accent-ink)",
  },
  waiting: {
    badge: "bg-(--warning-dot) text-(--on-accent)",
    glyph: "clock",
    label: "Waiting",
    text: "text-(--secondary)",
  },
};

type SignerChipProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Second line: an email, "Signed 17 Nov". */
  detail?: React.ReactNode;
  /** Position in the signing order, 0-based. Picks the signer colour. */
  index: number;
  name: string;
  /** The number shown on the order badge. Defaults to index + 1. */
  order?: number;
  /** Hide the order badge (unordered envelopes). */
  showOrder?: boolean;
  size?: "sm" | "md";
  state?: SignerState;
  /** Avatar only, with the name for screen readers. */
  compact?: boolean;
};

/**
 * A signer: initials on a soft tint of their signer colour (--signer-1..4,
 * the same colour their fields wear on the document), and their state as a
 * small badge plus words. The order number is spoken, not drawn. The colour never carries meaning on
 * its own: the name and state are always written.
 */
function SignerChip({
  className,
  compact = false,
  detail,
  index,
  name,
  order,
  showOrder = true,
  size = "md",
  state,
  ...props
}: SignerChipProps) {
  const palette = getSignerPalette(index);
  const stateInfo = state ? SIGNER_STATE[state] : undefined;
  const avatarSize =
    size === "sm" ? "size-6 text-[0.625rem]" : "size-8 text-xs";

  const avatar = (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium tracking-[0.01em] select-none",
          avatarSize,
        )}
        data-slot="signer-avatar"
        style={{
          background: palette.tint,
          color: palette.color,
        }}
      >
        {getInitials(name)}
      </span>
      {stateInfo ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-1 -bottom-1 inline-flex size-3.5 items-center justify-center rounded-full shadow-[0_0_0_2px_var(--paper)] [&_svg]:size-2",
            stateInfo.badge,
          )}
        >
          <FlagGlyph glyph={stateInfo.glyph} />
        </span>
      ) : null}
    </span>
  );

  const accessibleName = [
    showOrder ? `Signer ${order ?? index + 1}` : null,
    name,
    stateInfo?.label,
  ]
    .filter(Boolean)
    .join(", ");

  if (compact) {
    return (
      <div
        aria-label={accessibleName}
        className={cn("inline-flex", className)}
        data-slot="signer-chip"
        role="img"
        {...props}
      >
        {avatar}
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-w-0 items-center gap-3", className)}
      data-slot="signer-chip"
      data-state={state}
      {...props}
    >
      {avatar}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-5 font-medium text-(--fg)">
          {showOrder ? (
            <span className="sr-only">Signer {order ?? index + 1}: </span>
          ) : null}
          {name}
        </span>
        {detail || stateInfo ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] leading-5 text-(--secondary)">
            {stateInfo ? (
              <span className={cn("font-medium", stateInfo.text)}>
                {stateInfo.label}
              </span>
            ) : null}
            {stateInfo && detail ? <span aria-hidden="true">·</span> : null}
            {detail ? <span className="truncate">{detail}</span> : null}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export { Avatar, SignerChip };
