/*
 * SignuDoc's marks, from the brand identity canvas. Every mark here is
 * decorative unless a label is passed: the thing that links or explains
 * carries the accessible name.
 */
import { cn } from "@/lib/cn";
import { hashString } from "@/components/brand/seeded";

/** The S glyph inside the marks, in its own 78 x 100 box. */
function SGlyph({ fill, cut }: { cut: string; fill: string }) {
  return (
    <>
      <path
        d="M36,0H68A10,10 0 0 1 78,10V64A36,36 0 0 1 42,100H10A10,10 0 0 1 0,90V36A36,36 0 0 1 36,0Z"
        fill={fill}
      />
      <rect fill={cut} height="9" width="51" x="28" y="31" />
      <rect fill={cut} height="9" width="51" x="-1" y="60" />
    </>
  );
}

type IconTone = "ink" | "carbon" | "flag";

const ICON_TONES: Record<
  IconTone,
  { ground: string; glyph: string; cut: string; line: string }
> = {
  carbon: {
    cut: "var(--brand-carbon)",
    glyph: "var(--brand-tab-yellow)",
    ground: "var(--brand-carbon)",
    line: "var(--brand-bond)",
  },
  flag: {
    cut: "var(--brand-tab-yellow)",
    glyph: "var(--brand-carbon)",
    ground: "var(--brand-tab-yellow)",
    line: "var(--brand-ink-violet)",
  },
  ink: {
    cut: "var(--accent)",
    glyph: "var(--brand-bond)",
    ground: "var(--accent)",
    line: "var(--brand-tab-yellow)",
  },
};

/** The app icon: a rounded tile, the S, and the yellow x and sign line. */
export function AppIcon({
  className,
  label,
  tone = "ink",
}: {
  className?: string;
  label?: string;
  tone?: IconTone;
}) {
  const colors = ICON_TONES[tone];

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("block size-7 shrink-0", className)}
      role={label ? "img" : undefined}
      viewBox="-100 -100 200 200"
    >
      <rect
        fill={colors.ground}
        height="200"
        rx="45"
        width="200"
        x="-100"
        y="-100"
      />
      <g transform="translate(4,-14)">
        <g transform="skewX(-12) scale(1.12) translate(-39,-50)">
          <SGlyph cut={colors.cut} fill={colors.glyph} />
        </g>
      </g>
      <g transform="skewX(-12)">
        <path
          d="M-44,59L-30,73M-30,59L-44,73"
          fill="none"
          stroke={colors.line}
          strokeWidth="5"
        />
        <path d="M-18,66H48" fill="none" stroke={colors.line} strokeWidth="4" />
      </g>
    </svg>
  );
}

/** The scalloped notary edge, 36 lobes, as a path in a 216-unit box. */
const SEAL_EDGE = (() => {
  const points: string[] = [];
  const steps = 360;

  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const radius = 99.6 + 4.9 * Math.cos(angle * 36);

    points.push(
      `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`,
    );
  }

  return `M${points.join("L")}Z`;
})();

type SealTone = "paper" | "flag" | "violet";

const SEAL_TONES: Record<SealTone, { ground: string; ink: string }> = {
  /** Bond ground, accent ink. */
  paper: { ground: "var(--brand-bond)", ink: "var(--accent)" },
  /** Tab yellow ground, carbon ink. */
  flag: { ground: "var(--brand-tab-yellow)", ink: "var(--brand-carbon)" },
  /** Ink violet ground, Bond ink (the sticker sheet's small seal). */
  violet: { ground: "var(--brand-ink-violet)", ink: "var(--brand-bond)" },
};

/**
 * The seal: what a finished, verified document earns. `stamped` plays the
 * one-time stamp (see .seal-stamp in globals.css).
 *
 * `ringText` sets text on a circle between the scalloped edge and an inner
 * ring, like the sticker sheet's seal: "SEALED · SHA-256 · 17 NOV 2026 · ".
 * End it with a separator so the ring closes. Mono caps read best; keep it
 * to ~40 characters.
 */
export function Seal({
  className,
  label,
  ringText,
  stamped = false,
  tone = "paper",
}: {
  className?: string;
  label?: string;
  /** Text around the ring (decorative; put the facts in `label` too). */
  ringText?: string;
  stamped?: boolean;
  tone?: SealTone;
}) {
  const { ground, ink } = SEAL_TONES[tone];
  // Stable across server and browser: derived from the text, not a counter.
  const ringId = ringText
    ? `seal-ring-${hashString(`${tone}:${ringText}`).toString(36)}`
    : undefined;

  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "block size-24 shrink-0",
        stamped && "seal-stamp",
        className,
      )}
      role={label ? "img" : undefined}
      viewBox="-108 -108 216 216"
    >
      <path d={SEAL_EDGE} fill={ground} />
      {ringText && ringId ? (
        <>
          <path d="M0,-74A74,74 0 1 1 -0.01,-74" fill="none" id={ringId} />
          <text
            fill={ink}
            style={{
              fontFamily: "var(--font-code), ui-monospace, monospace",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2,
            }}
          >
            <textPath
              href={`#${ringId}`}
              lengthAdjust="spacing"
              textLength={461}
            >
              {ringText.toUpperCase()}
            </textPath>
          </text>
          <circle fill="none" r="62" stroke={ink} strokeWidth="2.5" />
          <g transform="skewX(-12) scale(0.8) translate(-39,-50)">
            <SGlyph cut={ground} fill={ink} />
          </g>
        </>
      ) : (
        <>
          <circle fill="none" r="82" stroke={ink} strokeWidth="3" />
          <g transform="skewX(-12) scale(1.05) translate(-39,-50)">
            <SGlyph cut={ground} fill={ink} />
          </g>
        </>
      )}
    </svg>
  );
}

/** The plate: the primary logo. Carbon plate, Bond wordmark, yellow line. */
export function Plate({
  className,
  label = "SignuDoc",
}: {
  className?: string;
  label?: string | null;
}) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label ?? undefined}
      className={cn("block h-8 w-auto", className)}
      role={label ? "img" : undefined}
      viewBox="-50 -10 811 196"
    >
      <g transform="skewX(-12)">
        <path
          d="M0,0H695L749,88.0L695,176H0Z"
          fill="var(--brand-carbon)"
          stroke="var(--brand-carbon)"
          strokeLinejoin="round"
          strokeWidth="16"
        />
        <g fill="var(--brand-bond)" transform="translate(34,26)">
          <path d="M36,0H68A10,10 0 0 1 78,10V64A36,36 0 0 1 42,100H10A10,10 0 0 1 0,90V36A36,36 0 0 1 36,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="9"
            width="51"
            x="28"
            y="31"
          />
          <rect
            fill="var(--brand-carbon)"
            height="9"
            width="51"
            x="-1"
            y="60"
          />
          <path d="M95,0H105A10,10 0 0 1 115,10V90A10,10 0 0 1 105,100H95A10,10 0 0 1 85,90V10A10,10 0 0 1 95,0Z" />
          <path d="M158,0H190A10,10 0 0 1 200,10V90A10,10 0 0 1 190,100H158A36,36 0 0 1 122,64V36A36,36 0 0 1 158,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="9"
            width="49"
            x="152"
            y="31"
          />
          <rect
            fill="var(--brand-carbon)"
            height="38"
            width="9"
            x="152"
            y="31"
          />
          <rect
            fill="var(--brand-carbon)"
            height="9"
            width="24"
            x="152"
            y="60"
          />
          <path d="M217,0H281A10,10 0 0 1 291,10V90A10,10 0 0 1 281,100H217A10,10 0 0 1 207,90V10A10,10 0 0 1 217,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="71"
            width="9"
            x="232"
            y="30"
          />
          <rect
            fill="var(--brand-carbon)"
            height="71"
            width="9"
            x="257"
            y="-1"
          />
          <path d="M308,0H366A10,10 0 0 1 376,10V64A36,36 0 0 1 340,100H334A36,36 0 0 1 298,64V10A10,10 0 0 1 308,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="69"
            width="9"
            x="332.5"
            y="-1"
          />
          <path d="M389,0H425A36,36 0 0 1 461,36V64A36,36 0 0 1 425,100H389A6,6 0 0 1 383,94V6A6,6 0 0 1 389,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="40"
            width="9"
            x="417.5"
            y="30"
          />
          <path d="M504,0H510A36,36 0 0 1 546,36V64A36,36 0 0 1 510,100H504A36,36 0 0 1 468,64V36A36,36 0 0 1 504,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="40"
            rx="4.5"
            width="9"
            x="502.5"
            y="30"
          />
          <path d="M589,0H621A10,10 0 0 1 631,10V90A10,10 0 0 1 621,100H589A36,36 0 0 1 553,64V36A36,36 0 0 1 589,0Z" />
          <rect
            fill="var(--brand-carbon)"
            height="9"
            width="47"
            x="585"
            y="45.5"
          />
        </g>
        <path
          d="M36,144L50,158M50,144L36,158"
          fill="none"
          stroke="var(--brand-tab-yellow)"
          strokeWidth="4"
        />
        <path
          d="M62,151H665"
          fill="none"
          stroke="var(--brand-tab-yellow)"
          strokeWidth="3"
        />
      </g>
    </svg>
  );
}

/**
 * The guilloche rosette: the brand's hero texture, for auth, completion and
 * verify grounds. Never behind working content.
 */
export function Rosette({
  className,
  rings = 4,
}: {
  className?: string;
  rings?: number;
}) {
  const loops = Array.from({ length: rings }, (_, ring) => {
    const base = 60 + ring * 46;
    const lobes = 24 + ring * 6;
    const points: string[] = [];

    for (let step = 0; step <= 720; step += 1) {
      const angle = (step / 720) * Math.PI * 2;
      const radius = base + 14 * Math.sin(angle * lobes);

      points.push(
        `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`,
      );
    }

    return `M${points.join("L")}Z`;
  });

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none block", className)}
      fill="none"
      viewBox="-260 -260 520 520"
    >
      {loops.map((path, index) => (
        <path
          d={path}
          key={index}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/**
 * Calm: the guilloche ribbon is retired and renders
 * nothing. The props are kept so older callers still compile.
 */
export function Ribbon(props: {
  className?: string;
  /** Band height in px. */
  height?: number;
  /** Interlaced strands. */
  strands?: number;
}) {
  void props;

  return null;
}
