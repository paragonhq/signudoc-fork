"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/*
 * Calm illustrations: a handful of soft,
 * simple drawings for empty states and onboarding moments only. Drawn from
 * the product's own shapes (a white page, a few lines of text, the violet
 * of a field, the S) in the brand palette: Bond, white, Ink violet, and
 * Tab yellow only where something is to be signed. No texture, no
 * stickers, no stamps. Every one is decorative (aria-hidden): the words
 * beside it carry the meaning.
 *
 * Each settles in once when it appears (a page fans out, a line is
 * drawn), which reduced motion turns into a plain fade.
 */

const PAGE_SHADOW = {
  filter:
    "drop-shadow(0 1px 1px rgb(var(--fg-rgb) / 0.06)) drop-shadow(0 10px 18px rgb(var(--fg-rgb) / 0.08))",
};

const SETTLE = { damping: 22, stiffness: 160, type: "spring" } as const;

function Frame({
  children,
  className,
  viewBox = "0 0 240 168",
}: {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("block h-auto w-60 max-w-full overflow-visible", className)}
      fill="none"
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

/** Text lines on a page: widths as fractions of the line. */
function Lines({
  widths,
  x,
  y,
  width,
  gap = 9,
}: {
  gap?: number;
  width: number;
  widths: readonly number[];
  x: number;
  y: number;
}) {
  return (
    <>
      {widths.map((fraction, index) => (
        <rect
          fill="var(--surface-strong)"
          height="4"
          key={index}
          rx="2"
          width={width * fraction}
          x={x}
          y={y + index * gap}
        />
      ))}
    </>
  );
}

/** A small S app mark, drawn flat in the accent. */
function SMark({ x, y, size = 18 }: { size?: number; x: number; y: number }) {
  const scale = size / 100;

  return (
    <g
      transform={`translate(${String(x)} ${String(y)}) scale(${String(scale)})`}
    >
      <rect fill="var(--accent)" height="100" rx="24" width="100" />
      <g transform="translate(52 44) skewX(-12) scale(0.62) translate(-39 -50)">
        <path
          d="M36,0H68A10,10 0 0 1 78,10V64A36,36 0 0 1 42,100H10A10,10 0 0 1 0,90V36A36,36 0 0 1 36,0Z"
          fill="var(--paper)"
        />
        <rect fill="var(--accent)" height="9" width="51" x="28" y="31" />
        <rect fill="var(--accent)" height="9" width="51" x="-1" y="60" />
      </g>
    </g>
  );
}

/**
 * Three pages, fanned: the same document, ready to go out again. For the
 * templates library when it is empty.
 */
export function DocumentStackIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <Frame className={className}>
      <ellipse
        cx="120"
        cy="156"
        fill="rgb(var(--fg-rgb) / 0.05)"
        rx="78"
        ry="7"
      />
      <motion.g
        animate={{ rotate: -9, x: -26 }}
        initial={{ rotate: 0, x: 0 }}
        style={{
          ...PAGE_SHADOW,
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
        }}
        transition={{ ...SETTLE, delay: 0.08 }}
      >
        <rect
          fill="var(--paper)"
          height="128"
          rx="8"
          width="96"
          x="72"
          y="18"
        />
        <Lines widths={[0.55, 0.9, 0.8]} width={68} x={86} y={36} />
      </motion.g>
      <motion.g
        animate={{ rotate: 8, x: 26 }}
        initial={{ rotate: 0, x: 0 }}
        style={{
          ...PAGE_SHADOW,
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
        }}
        transition={{ ...SETTLE, delay: 0.12 }}
      >
        <rect
          fill="var(--paper)"
          height="128"
          rx="8"
          width="96"
          x="72"
          y="18"
        />
        <Lines widths={[0.5, 0.95, 0.85, 0.7]} width={68} x={86} y={36} />
      </motion.g>
      <g style={PAGE_SHADOW}>
        <rect
          fill="var(--paper)"
          height="132"
          rx="8"
          width="100"
          x="70"
          y="14"
        />
        <SMark size={16} x={84} y={28} />
        <rect
          fill="var(--fg)"
          height="5"
          opacity="0.8"
          rx="2.5"
          width="40"
          x="106"
          y="34"
        />
        <Lines widths={[1, 0.86, 0.94, 0.62]} width={72} x={84} y={56} />
        <rect
          fill="var(--accent-soft)"
          height="16"
          rx="4"
          width="40"
          x="84"
          y="104"
        />
        <rect
          fill="var(--accent)"
          height="3"
          opacity="0.7"
          rx="1.5"
          width="24"
          x="92"
          y="110.5"
        />
        <rect
          fill="var(--signer-2-tint)"
          height="16"
          rx="4"
          width="28"
          x="128"
          y="104"
        />
      </g>
    </Frame>
  );
}

/**
 * A page with a line waiting for a signature, its yellow sign-here tab and
 * a violet signature being drawn. For first-run moments about sending.
 */
export function SignatureLineIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <Frame className={className}>
      <ellipse
        cx="120"
        cy="156"
        fill="rgb(var(--fg-rgb) / 0.05)"
        rx="70"
        ry="7"
      />
      <g style={PAGE_SHADOW}>
        <rect
          fill="var(--paper)"
          height="136"
          rx="8"
          width="112"
          x="64"
          y="10"
        />
        <rect
          fill="var(--fg)"
          height="5"
          opacity="0.8"
          rx="2.5"
          width="46"
          x="80"
          y="26"
        />
        <Lines widths={[1, 0.9, 0.96, 0.7, 0.84]} width={80} x={80} y={42} />
        <rect
          fill="var(--surface-strong)"
          height="1.5"
          width="64"
          x="80"
          y="124"
        />
      </g>
      <g>
        <path d="M58 112h18l6 6-6 6H58z" fill="var(--sign-here)" />
      </g>
      <motion.path
        animate={{ pathLength: 1 }}
        d="M84 120c6-14 10-14 9-4s4 6 9-4 6-4 5 3c-1 7 6 1 10-4 3-4 6-3 6 1 0 3 4 2 8-2"
        initial={{ pathLength: 0 }}
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
        transition={{ delay: 0.25, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
      />
    </Frame>
  );
}

/** A finished page with a small violet seal. For completed moments. */
export function SealedDocumentIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <Frame className={className}>
      <ellipse
        cx="120"
        cy="156"
        fill="rgb(var(--fg-rgb) / 0.05)"
        rx="70"
        ry="7"
      />
      <g style={PAGE_SHADOW}>
        <rect
          fill="var(--paper)"
          height="136"
          rx="8"
          width="112"
          x="64"
          y="10"
        />
        <rect
          fill="var(--fg)"
          height="5"
          opacity="0.8"
          rx="2.5"
          width="46"
          x="80"
          y="26"
        />
        <Lines widths={[1, 0.9, 0.96, 0.7]} width={80} x={80} y={42} />
        <path
          d="M82 118c5-9 8-9 8-3s3 4 7-3 5-2 4 2 5 0 8-3"
          stroke="var(--fg)"
          strokeLinecap="round"
          strokeOpacity="0.55"
          strokeWidth="1.75"
        />
        <rect
          fill="var(--surface-strong)"
          height="1.5"
          width="52"
          x="80"
          y="124"
        />
      </g>
      <motion.g
        animate={{ opacity: 1, scale: 1 }}
        initial={{ opacity: 0, scale: 0.8 }}
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        transition={{ ...SETTLE, delay: 0.2 }}
      >
        <circle cx="160" cy="116" fill="var(--accent)" r="18" />
        <circle
          cx="160"
          cy="116"
          r="13"
          stroke="var(--paper)"
          strokeOpacity="0.35"
        />
        <path
          d="m153 116 5 5 9-10"
          stroke="var(--paper)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </motion.g>
    </Frame>
  );
}

/** A page and the people who sign it, in order. For roles and teams. */
export function TeamIllustration({ className }: { className?: string }) {
  const people = [
    { color: "var(--signer-1)", tint: "var(--signer-1-tint)", x: 150, y: 44 },
    { color: "var(--signer-2)", tint: "var(--signer-2-tint)", x: 168, y: 82 },
    { color: "var(--signer-3)", tint: "var(--signer-3-tint)", x: 150, y: 120 },
  ];

  return (
    <Frame className={className}>
      <ellipse
        cx="112"
        cy="156"
        fill="rgb(var(--fg-rgb) / 0.05)"
        rx="70"
        ry="7"
      />
      <g style={PAGE_SHADOW}>
        <rect
          fill="var(--paper)"
          height="136"
          rx="8"
          width="100"
          x="44"
          y="10"
        />
        <rect
          fill="var(--fg)"
          height="5"
          opacity="0.8"
          rx="2.5"
          width="40"
          x="58"
          y="26"
        />
        <Lines widths={[1, 0.85, 0.92]} width={72} x={58} y={42} />
        <rect
          fill="var(--signer-1-tint)"
          height="12"
          rx="3"
          width="34"
          x="58"
          y="78"
        />
        <rect
          fill="var(--signer-2-tint)"
          height="12"
          rx="3"
          width="34"
          x="58"
          y="98"
        />
        <rect
          fill="var(--signer-3-tint)"
          height="12"
          rx="3"
          width="34"
          x="58"
          y="118"
        />
      </g>
      {people.map((person, index) => (
        <motion.g
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: -10 }}
          key={index}
          transition={{ ...SETTLE, delay: 0.12 + index * 0.08 }}
        >
          <circle
            cx={person.x}
            cy={person.y}
            fill="var(--paper)"
            r="15"
            style={PAGE_SHADOW}
          />
          <circle cx={person.x} cy={person.y} fill={person.tint} r="12" />
          <circle cx={person.x} cy={person.y - 3} fill={person.color} r="4" />
          <path
            d={`M${String(person.x - 6)} ${String(person.y + 7)}a6 5 0 0 1 12 0`}
            fill={person.color}
          />
        </motion.g>
      ))}
    </Frame>
  );
}
