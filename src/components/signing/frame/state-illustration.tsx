"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/cn";

/*
 * The drawing for a signing link that has nowhere to go (expired, voided,
 * declined, an error) and for the download-renewal card: the same white
 * page the calm illustrations use (src/components/illustrations), with one
 * small round badge on its corner that says what happened. The badge
 * settles in like the seal, softer; under reduced motion MotionConfig keeps
 * only the fade. Decorative: the heading beside it carries the meaning.
 */

export type StateBadge =
  "clock" | "declined" | "error" | "mail" | "signed" | "void";

const BADGE_TONE: Record<StateBadge, { fill: string; ink: string }> = {
  clock: { fill: "var(--warning-soft)", ink: "var(--warning)" },
  declined: { fill: "var(--surface-strong)", ink: "var(--secondary-strong)" },
  error: { fill: "var(--danger-soft)", ink: "var(--danger)" },
  mail: { fill: "var(--success-soft)", ink: "var(--success)" },
  signed: { fill: "var(--accent)", ink: "var(--paper)" },
  void: { fill: "var(--surface-strong)", ink: "var(--secondary-strong)" },
};

const PAGE_SHADOW = {
  filter:
    "drop-shadow(0 1px 1px rgb(var(--fg-rgb) / 0.06)) drop-shadow(0 10px 18px rgb(var(--fg-rgb) / 0.08))",
};

const SETTLE = { damping: 20, stiffness: 220, type: "spring" } as const;

function BadgeGlyph({ badge, ink }: { badge: StateBadge; ink: string }) {
  const stroke = {
    stroke: ink,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.25,
  };

  switch (badge) {
    case "clock":
      return (
        <>
          <circle cx="0" cy="0" fill="none" r="8.5" {...stroke} />
          <motion.path
            animate={{ rotate: 0 }}
            d="M0 0V-5"
            initial={{ rotate: -120 }}
            style={{ transformBox: "view-box", transformOrigin: "0 0" }}
            transition={{ ...SETTLE, delay: 0.35 }}
            {...stroke}
          />
          <path d="M0 0l3.5 2.5" {...stroke} />
        </>
      );
    case "declined":
      return <path d="M-5 -5l10 10M5 -5l-10 10" {...stroke} />;
    case "void":
      return (
        <>
          <circle cx="0" cy="0" fill="none" r="7.5" {...stroke} />
          <path d="M-5.3 5.3l10.6-10.6" {...stroke} />
        </>
      );
    case "error":
      return (
        <>
          <path d="M6.5 -1.5A6.5 6.5 0 1 1 3 -5.6" fill="none" {...stroke} />
          <path d="M3 -9.5v4h4" fill="none" {...stroke} />
        </>
      );
    case "mail":
      return (
        <>
          <rect
            fill="none"
            height="12"
            rx="2.5"
            width="17"
            x="-8.5"
            y="-6"
            {...stroke}
          />
          <path d="M-8 -4.5l8 5.5 8-5.5" fill="none" {...stroke} />
        </>
      );
    case "signed":
    default:
      return <path d="M-6 0l4 4 8-9" fill="none" {...stroke} />;
  }
}

/** A page with one round badge on its corner. */
export function StateIllustration({
  badge,
  className,
  muted = false,
}: {
  badge: StateBadge;
  className?: string;
  /** Fade the page itself: nothing on it counts any more. */
  muted?: boolean;
}) {
  const tone = BADGE_TONE[badge];

  return (
    <svg
      aria-hidden="true"
      className={cn("block h-auto w-48 max-w-full overflow-visible", className)}
      fill="none"
      viewBox="0 0 240 168"
    >
      <ellipse
        cx="120"
        cy="156"
        fill="rgb(var(--fg-rgb) / 0.05)"
        rx="66"
        ry="7"
      />
      <g opacity={muted ? 0.72 : 1} style={PAGE_SHADOW}>
        <rect
          fill="var(--paper)"
          height="136"
          rx="8"
          width="108"
          x="66"
          y="10"
        />
        <rect
          fill="var(--fg)"
          height="5"
          opacity="0.75"
          rx="2.5"
          width="44"
          x="82"
          y="26"
        />
        {[1, 0.88, 0.95, 0.66].map((fraction, index) => (
          <rect
            fill="var(--surface-strong)"
            height="4"
            key={index}
            rx="2"
            width={76 * fraction}
            x="82"
            y={42 + index * 9}
          />
        ))}
        <rect
          fill={
            muted ? "var(--surface-strong)" : "rgb(var(--sign-here-rgb) / 0.55)"
          }
          height="18"
          rx="4"
          width="50"
          x="82"
          y="98"
        />
        <rect
          fill="var(--surface-strong)"
          height="1.5"
          width="50"
          x="82"
          y="124"
        />
      </g>
      <AnimatePresence initial mode="popLayout">
        <motion.g
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          initial={{ opacity: 0, scale: 0.6 }}
          key={badge}
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          transition={{ ...SETTLE, delay: 0.15 }}
        >
          <circle cx="166" cy="118" fill="var(--paper)" r="27" />
          <circle cx="166" cy="118" fill={tone.fill} r="23" />
          <g transform="translate(166 118) scale(1.15)">
            <BadgeGlyph badge={badge} ink={tone.ink} />
          </g>
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}
