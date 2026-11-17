"use client";

import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { Seal } from "@/components/brand/marks";
import { cn } from "@/lib/cn";

import {
  InnerShadowFilter,
  OBJECT_ROOT,
  PAPER_CONTACT,
  PAPER_EDGE,
} from "./material";
import {
  JUMP,
  objectScale,
  SPRING,
  svgId,
  useObjectPose,
  useObjectReducedMotion,
  type ObjectPose,
  type ObjectSize,
} from "./object-motion";

/*
 * The envelope: SignuDoc's object for sending, drafts and empty states.
 *
 * Built like a real one seen from the back, in layers (back to front): the
 * inside of the back panel, the letter, the pocket (side and bottom flaps)
 * and the top flap, hinged at the top edge. The flap is translucent and
 * blurs what is behind it, clipped to its own path; once it opens past
 * upright it passes behind the letter, as a real flap does.
 *
 * Poses: rest (closed, flap down on the top edge, the letter a soft shape
 * behind the frosted flap), hover (the flap tilts open, the letter rises to show its
 * first lines), active (the flap opens fully, the letter slides out and its
 * signature line glows). Opening runs flap → letter; closing flips it.
 *
 * The send sequence (the letter slides in, the flap closes, a small seal
 * presses on, the envelope lifts and settles) runs from `send`
 * ("closing" while the request is out, "sealed" once it is sent; sealing
 * waits for the flap if it is still closing) or from `ref.playSend()`,
 * which resolves when it has settled.
 *
 *   <Envelope interactive size="md" />
 *   <Envelope pose="active" send={phase === "sent" ? "sealed" : phase === "sending" ? "closing" : "idle"} />
 */

/*
 * One master geometry, in px at md: every part is derived from the same
 * width, height, corner radius, hinge (the top edge) and centre point, so
 * back, pocket, flap and letter align at every size and pose. Edges sit on
 * half pixels (0.5 in from the box) so 1px hairlines land on whole device
 * pixels at md.
 */
const W = 160;
const H = 108;
/** Corner radius, shared by the back, the pocket and the flap's base. */
const R = 6;
/** The box edges, on half pixels. */
const L = 0.5;
const RT = W - 0.5;
const T = 0.5;
const B = H - 0.5;
const MID = W / 2;
/** Where the closed flap's tip lands and the bottom folds meet. */
const CENTER_Y = 64;
/** The pocket's opening dips to here, under the closed flap. */
const V_Y = 56;
/** The flap's tip rounding (distance cut back along each edge). */
const TIP = 5;
const FLAP_H = Math.ceil(CENTER_Y + 1);
const LETTER = { height: 92, left: 14, width: W - 28 } as const;

const n = (value: number) => Number(value.toFixed(2));

/** A point `distance` from (x1, y1) toward (x2, y2). */
function toward(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  distance: number,
) {
  const length = Math.hypot(x2 - x1, y2 - y1);

  return [
    n(x1 + ((x2 - x1) / length) * distance),
    n(y1 + ((y2 - y1) / length) * distance),
  ] as const;
}

/** The top edge with its two rounded corners, left to right. */
const TOP_EDGE = `M${L},${T + R}A${R},${R} 0 0 1 ${L + R},${T}H${RT - R}A${R},${R} 0 0 1 ${RT},${T + R}`;

/** The inside of the back panel: the full rounded rectangle. */
const BACK_PATH = `${TOP_EDGE}V${B - R}A${R},${R} 0 0 1 ${RT - R},${B}H${L + R}A${R},${R} 0 0 1 ${L},${B - R}Z`;

/** A V from both top corners down to (MID, y), its vertex softened. */
function vee(y: number, cut: number, cornerY = T + R) {
  const [lx, ly] = toward(MID, y, L, cornerY, cut);
  const [rx, ry] = toward(MID, y, RT, cornerY, cut);

  return { lx, ly, rx, ry };
}

const POCKET_V = vee(V_Y, 4);
/** The pocket: side and bottom flaps, open in a V at the top. */
const POCKET_PATH = `M${L},${T + R}L${POCKET_V.lx},${POCKET_V.ly}Q${MID},${V_Y} ${POCKET_V.rx},${POCKET_V.ry}L${RT},${T + R}V${B - R}A${R},${R} 0 0 1 ${RT - R},${B}H${L + R}A${R},${R} 0 0 1 ${L},${B - R}Z`;

/** The bottom flap's edges: from the bottom corners to the centre. */
const CORNER = R * (1 - Math.SQRT1_2);
const FOLD_PATH = `M${n(L + CORNER)},${n(B - CORNER)}L${MID},${CENTER_Y}L${n(RT - CORNER)},${n(B - CORNER)}`;

/*
 * Open, the flap and the back are one sheet folded at the hinge, so the
 * hinge runs straight to square corners: the back's top and the flap's
 * base lose their rounding while the flap is past upright (it switches
 * edge-on, where it cannot be seen).
 */
const BACK_OPEN_PATH = `M${L},${T}H${RT}V${B - R}A${R},${R} 0 0 1 ${RT - R},${B}H${L + R}A${R},${R} 0 0 1 ${L},${B - R}Z`;
/** The back's short side edges above the pocket, while open. */
const BACK_OPEN_EDGES = `M${L},${T + R}V${T}M${RT},${T}V${T + R}`;

const SEAL = 26;

const FLAP_TIP = vee(CENTER_Y, TIP);
/** The top flap: the top edge and corners, straight to a crisp tip. */
const FLAP_PATH = `${TOP_EDGE}L${FLAP_TIP.rx},${FLAP_TIP.ry}Q${MID},${CENTER_Y} ${FLAP_TIP.lx},${FLAP_TIP.ly}Z`;
const FLAP_OPEN_TIP = vee(CENTER_Y, TIP, T);
/** The flap's inside, seen once open: square at the hinge. */
const FLAP_INSIDE_PATH = `M${L},${T}H${RT}L${FLAP_OPEN_TIP.rx},${FLAP_OPEN_TIP.ry}Q${MID},${CENTER_Y} ${FLAP_OPEN_TIP.lx},${FLAP_OPEN_TIP.ly}Z`;

/**
 * bond: warm Bond paper, for white surfaces (the default). paper: white,
 * for tinted wells. ink: Ink violet. contrast: carbon (light in dark mode).
 */
export type EnvelopeTheme = "bond" | "paper" | "ink" | "contrast";

/** Colour maps from tokens; dark mode follows the tokens. */
const THEMES: Record<EnvelopeTheme, CSSProperties> = {
  contrast: {
    "--env-back": "color-mix(in srgb, var(--fg) 82%, var(--page))",
    "--env-body": "var(--fg)",
    "--env-flap": "color-mix(in srgb, var(--fg) 86%, transparent)",
    "--env-flap-inside": "color-mix(in srgb, var(--fg) 88%, var(--page))",
    "--env-fold": "rgb(var(--page-rgb) / 0.1)",
    "--env-stroke": "color-mix(in srgb, var(--fg) 78%, var(--page))",
  } as CSSProperties,
  ink: {
    "--env-back": "color-mix(in srgb, black 24%, var(--accent))",
    "--env-body": "var(--accent)",
    "--env-flap": "color-mix(in srgb, var(--accent) 86%, transparent)",
    "--env-flap-inside": "color-mix(in srgb, black 14%, var(--accent))",
    "--env-fold": "rgb(0 0 0 / 0.14)",
    "--env-stroke": "color-mix(in srgb, black 22%, var(--accent))",
  } as CSSProperties,
  bond: {
    "--env-back": "color-mix(in srgb, black 7%, var(--obj-bond))",
    "--env-body": "var(--obj-bond)",
    "--env-flap": "color-mix(in srgb, var(--obj-bond) 84%, transparent)",
    "--env-flap-inside": "color-mix(in srgb, black 4%, var(--obj-bond))",
    "--env-fold": "rgb(var(--fg-rgb) / 0.07)",
    "--env-stroke": "rgb(var(--fg-rgb) / 0.13)",
  } as CSSProperties,
  paper: {
    "--env-back": "color-mix(in srgb, black 6%, var(--obj-white))",
    "--env-body": "var(--obj-white)",
    "--env-flap": "color-mix(in srgb, var(--obj-white) 84%, transparent)",
    "--env-flap-inside": "color-mix(in srgb, black 3%, var(--obj-white))",
    "--env-fold": "rgb(var(--fg-rgb) / 0.07)",
    "--env-stroke": "rgb(var(--fg-rgb) / 0.12)",
  } as CSSProperties,
};

const SEAL_TONE = {
  bond: "violet",
  contrast: "violet",
  ink: "paper",
  paper: "violet",
} as const;

/** Where the send sequence is. */
export type EnvelopeSend = "idle" | "closing" | "sealed";

export type EnvelopeHandle = {
  /** Letter in, flap closed, seal pressed, lift and settle. */
  playSend: () => Promise<void>;
  /** Back to the pose, unsealed. */
  reset: () => void;
};

type Stage = ObjectPose | "closed";

type Targets = {
  flap: number;
  glow: number;
  letter: number;
};

const POSES: Record<Stage, Targets> = {
  active: { flap: 180, glow: 1, letter: -56 },
  closed: { flap: 0, glow: 0, letter: 10 },
  hover: { flap: 150, glow: 0, letter: -12 },
  rest: { flap: 0, glow: 0, letter: 10 },
};

/**
 * Per pose, how each part travels there. Opening leads with the flap and
 * the letter follows; closing leads with the letter and the flap follows.
 */
function stageTransitions(stage: Stage): Record<keyof Targets, Transition> {
  switch (stage) {
    case "active":
      return {
        flap: { ...SPRING.body, delay: 0 },
        glow: { delay: 0.34, duration: 0.3, ease: "easeOut" },
        letter: { ...SPRING.body, delay: 0.1 },
      };
    case "hover":
      return {
        flap: { ...SPRING.body, delay: 0 },
        glow: { duration: 0.12 },
        letter: { ...SPRING.body, delay: 0.06 },
      };
    case "closed":
      return {
        flap: { ...SPRING.body, damping: 17, delay: 0.14 },
        glow: { duration: 0.1 },
        letter: { ...SPRING.firm, delay: 0 },
      };
    default:
      return {
        flap: { ...SPRING.body, delay: 0.08 },
        glow: { duration: 0.12 },
        letter: { ...SPRING.body, delay: 0 },
      };
  }
}

/** How long the flap takes to close before a seal can press on it. */
const CLOSE_MS = 470;
/** From the press to the lift having settled. */
const SEAL_SETTLE_MS = 820;

export type EnvelopeProps = {
  className?: string;
  /** A signature line with a small yellow x on the letter (default true). */
  forSigning?: boolean;
  /** Its own hover (mouse) and click/tap (toggles open). */
  interactive?: boolean;
  /** Your own letter face (replaces the calm lines). */
  letter?: ReactNode;
  /** A real first page for the letter. */
  letterSrc?: string;
  /** Called once the send sequence has settled. */
  onSendComplete?: () => void;
  pose?: ObjectPose;
  ref?: Ref<EnvelopeHandle>;
  /** Overrides `size` with an exact factor of the master geometry. */
  scale?: number;
  /** Drive the send sequence declaratively. */
  send?: EnvelopeSend;
  size?: ObjectSize;
  theme?: EnvelopeTheme;
};

export function Envelope({
  className,
  forSigning = true,
  interactive = false,
  letter,
  letterSrc,
  onSendComplete,
  pose: posed = "rest",
  ref,
  scale,
  send = "idle",
  size = "md",
  theme = "bond",
}: EnvelopeProps) {
  const reduce = useObjectReducedMotion();
  const { handlers, pose } = useObjectPose({ interactive, pose: posed });
  const [played, setPlayed] = useState<EnvelopeSend>("idle");
  const sequence = played !== "idle" ? played : send;
  const stage: Stage = sequence === "idle" ? pose : "closed";
  const factor = objectScale(size, scale);
  /** A 1px hairline on screen at every size. */
  const hair = 1 / factor;

  const reactId = useId();
  const innerId = svgId(reactId, "envelope-inner");
  const softId = svgId(reactId, "envelope-soft");

  const initial = POSES[stage];
  const flap = useMotionValue(initial.flap);
  const letterY = useMotionValue(initial.letter);
  const glow = useMotionValue(initial.glow);
  const sealScale = useMotionValue(sequence === "sealed" ? 1 : 1.8);
  const sealOpacity = useMotionValue(sequence === "sealed" ? 1 : 0);
  const bodyY = useMotionValue(0);

  // Past upright the flap passes behind the letter and shows its inside.
  const flapZ = useTransform(flap, (angle) => (angle > 90 ? 1 : 5));
  const outsideOpacity = useTransform(flap, (angle) => (angle > 90 ? 0 : 1));
  const insideOpacity = useTransform(flap, (angle) => (angle > 90 ? 1 : 0));
  const contactScale = useTransform(bodyY, [-12, 0], [0.82, 1]);
  const contactOpacity = useTransform(bodyY, [-12, 0], [0.45, 1]);

  // Pose changes: each part springs to its target from wherever it is.
  useEffect(() => {
    const targets = POSES[stage];
    const transitions = stageTransitions(stage);
    const run = (value: MotionValue<number>, key: keyof Targets) =>
      animate(value, targets[key], reduce ? JUMP : transitions[key]);
    const controls = [
      run(flap, "flap"),
      run(letterY, "letter"),
      run(glow, "glow"),
    ];

    return () => controls.forEach((control) => control.stop());
  }, [flap, glow, letterY, reduce, stage]);

  // The send sequence's second half: the seal presses on once the flap is
  // down, then the envelope lifts a little and settles.
  const closingSince = useRef<number | null>(null);
  const completeRef = useRef(onSendComplete);
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    completeRef.current = onSendComplete;
  }, [onSendComplete]);

  useEffect(() => {
    if (sequence === "idle") {
      closingSince.current = null;

      const controls = [
        animate(sealOpacity, 0, { duration: reduce ? 0 : 0.12 }),
        animate(sealScale, 1.8, JUMP),
        animate(bodyY, 0, reduce ? JUMP : SPRING.firm),
      ];

      return () => controls.forEach((control) => control.stop());
    }

    const now = performance.now();

    closingSince.current ??= now;

    if (sequence === "closing") {
      return;
    }

    const waited = now - closingSince.current;
    const wait = reduce ? 0 : Math.max(0, CLOSE_MS - waited) / 1000;
    const controls: AnimationPlaybackControls[] = [
      animate(
        sealOpacity,
        1,
        reduce ? JUMP : { delay: wait, duration: 0.1, ease: "easeOut" },
      ),
      animate(
        sealScale,
        1,
        reduce
          ? JUMP
          : { damping: 18, delay: wait, stiffness: 420, type: "spring" },
      ),
      animate(
        bodyY,
        -6,
        reduce ? JUMP : { ...SPRING.lively, delay: wait + 0.1 },
      ),
    ];
    const settled = window.setTimeout(
      () => {
        completeRef.current?.();
        resolveRef.current?.();
        resolveRef.current = null;
      },
      reduce ? 0 : wait * 1000 + SEAL_SETTLE_MS,
    );

    return () => {
      window.clearTimeout(settled);
      controls.forEach((control) => control.stop());
    };
  }, [bodyY, reduce, sealOpacity, sealScale, sequence]);

  useImperativeHandle(
    ref,
    () => ({
      playSend: () =>
        new Promise<void>((resolve) => {
          resolveRef.current?.();
          resolveRef.current = resolve;
          setPlayed("sealed");
        }),
      reset: () => {
        resolveRef.current?.();
        resolveRef.current = null;
        setPlayed("idle");
      },
    }),
    [],
  );

  return (
    <span
      aria-hidden="true"
      className={cn(
        OBJECT_ROOT,
        "relative inline-block shrink-0 align-middle",
        interactive && "cursor-pointer",
        className,
      )}
      data-pose={stage}
      data-send={sequence}
      data-slot="envelope"
      style={{
        ...THEMES[theme],
        height: H * factor,
        width: W * factor,
      }}
      {...handlers}
    >
      <span
        className="absolute top-0 left-0 block origin-top-left"
        style={{ height: H, transform: `scale(${String(factor)})`, width: W }}
      >
        {/* The contact shadow stays on the table when the envelope lifts. */}
        <motion.span
          className="absolute -bottom-2 left-3 right-3 block h-4 rounded-[50%]"
          style={{
            background:
              "radial-gradient(closest-side, var(--obj-contact), transparent)",
            opacity: contactOpacity,
            scale: contactScale,
          }}
        />

        <motion.span className="absolute inset-0 block" style={{ y: bodyY }}>
          <svg
            className="absolute inset-0 overflow-visible"
            height={H}
            viewBox={`0 0 ${String(W)} ${String(H)}`}
            width={W}
          >
            <defs>
              <InnerShadowFilter
                blur={4}
                dy={2}
                highlight={false}
                id={innerId}
              />
              <InnerShadowFilter blur={2.5} dy={1} id={softId} />
            </defs>
            {/* No outline of its own: the pocket and the flap draw the
                silhouette, so no edge is ever drawn twice. */}
            <motion.path
              d={BACK_PATH}
              fill="var(--env-back)"
              filter={`url(#${innerId})`}
              style={{ opacity: outsideOpacity }}
            />
            <motion.g style={{ opacity: insideOpacity }}>
              <path
                d={BACK_OPEN_PATH}
                fill="var(--env-back)"
                filter={`url(#${innerId})`}
              />
              <path
                d={BACK_OPEN_EDGES}
                fill="none"
                stroke="var(--env-stroke)"
                strokeLinejoin="round"
                strokeWidth={hair}
              />
            </motion.g>
          </svg>

          {/* The flap, hinged at the top edge. */}
          <motion.span
            className="absolute top-0 left-0 block"
            style={{
              height: FLAP_H,
              // The hinge is the top edge itself (on its half pixel).
              originY: T / FLAP_H,
              rotateX: flap,
              transformPerspective: 460,
              width: W,
              zIndex: flapZ,
            }}
          >
            <motion.span
              className="absolute inset-0 block"
              style={{ opacity: outsideOpacity }}
            >
              <span
                className="absolute inset-0 block backdrop-blur-[6px]"
                style={{ clipPath: `path("${FLAP_PATH}")` }}
              />
              <svg
                className="absolute inset-0 overflow-visible"
                height={FLAP_H}
                viewBox={`0 0 ${String(W)} ${String(FLAP_H)}`}
                width={W}
              >
                <path
                  d={FLAP_PATH}
                  fill="var(--env-flap)"
                  filter={`url(#${softId})`}
                  stroke="var(--env-stroke)"
                  strokeLinejoin="round"
                  strokeWidth={hair}
                />
              </svg>
            </motion.span>
            <motion.span
              className="absolute inset-0 block"
              style={{ opacity: insideOpacity }}
            >
              <svg
                className="absolute inset-0 overflow-visible"
                height={FLAP_H}
                viewBox={`0 0 ${String(W)} ${String(FLAP_H)}`}
                width={W}
              >
                <path
                  d={FLAP_INSIDE_PATH}
                  fill="var(--env-flap-inside)"
                  filter={`url(#${innerId})`}
                  stroke="var(--env-stroke)"
                  strokeLinejoin="round"
                  strokeWidth={hair}
                />
              </svg>
            </motion.span>
          </motion.span>

          {/* The letter. */}
          <motion.span
            className="absolute top-0 z-[2] block rounded-[4px] bg-(--paper-fill)"
            style={{
              boxShadow: PAPER_CONTACT,
              height: LETTER.height,
              left: LETTER.left,
              width: LETTER.width,
              y: letterY,
            }}
          >
            <span className="absolute inset-0 block overflow-hidden rounded-[inherit]">
              {letter ??
                (letterSrc ? (
                  // Decorative: the words around the envelope name it.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="absolute inset-0 size-full object-cover object-top"
                    decoding="async"
                    draggable={false}
                    src={letterSrc}
                  />
                ) : (
                  <LetterLines />
                ))}
              {forSigning && !letterSrc && !letter ? (
                <SignLine glow={glow} />
              ) : null}
            </span>
            {forSigning && (letterSrc || letter) ? (
              // On a real page: a sign-here flag at the edge, as on paper.
              <span
                className="absolute -right-[5px] top-[58px] block h-[11px] w-[11px] rounded-r-[3px] bg-(--sign-here)"
                style={{
                  boxShadow: "inset -1px 0 0 rgb(var(--fg-rgb) / 0.12)",
                }}
              />
            ) : null}
            <span
              className="pointer-events-none absolute inset-0 block rounded-[inherit]"
              style={{ boxShadow: PAPER_EDGE }}
            />
          </motion.span>

          {/* The pocket, in front of the letter. */}
          <svg
            className="absolute inset-0 z-[3] overflow-visible"
            height={H}
            viewBox={`0 0 ${String(W)} ${String(H)}`}
            width={W}
          >
            <path
              d={POCKET_PATH}
              fill="var(--env-body)"
              filter={`url(#${softId})`}
              stroke="var(--env-stroke)"
              strokeLinejoin="round"
              strokeWidth={hair}
            />
            <path
              d={FOLD_PATH}
              fill="none"
              stroke="var(--env-fold)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={hair}
            />
          </svg>

          {/* The seal, pressed onto the closed flap's tip. */}
          <motion.span
            className="absolute z-[6] block"
            style={{
              height: SEAL,
              left: MID - SEAL / 2,
              opacity: sealOpacity,
              scale: sealScale,
              top: CENTER_Y - 6 - SEAL / 2,
              width: SEAL,
            }}
          >
            <Seal
              className="size-full drop-shadow-[0_1px_1px_rgb(var(--fg-rgb)/0.25)]"
              tone={SEAL_TONE[theme]}
            />
          </motion.span>
        </motion.span>
      </span>
    </span>
  );
}

/** A few calm lines of text: a title, a short paragraph. */
function LetterLines() {
  return (
    <svg
      className="absolute inset-0"
      height={LETTER.height}
      viewBox={`0 0 ${String(LETTER.width)} ${String(LETTER.height)}`}
      width={LETTER.width}
    >
      <rect
        fill="var(--paper-line-strong)"
        height="4"
        rx="2"
        width="44"
        x="12"
        y="12"
      />
      {[104, 96, 100, 62].map((width, index) => (
        <rect
          fill="var(--paper-line)"
          height="3"
          key={index}
          rx="1.5"
          width={width}
          x="12"
          y={23 + index * 7}
        />
      ))}
    </svg>
  );
}

/**
 * Where to sign: a small yellow tab with an x and a line, drawn on the
 * letter (so the pocket covers it like the paper). Placed so it sits fully
 * above the pocket's V when the letter is out (active) and fully below it
 * at hover and rest. It glows when the letter is fully out.
 */
function SignLine({ glow }: { glow: MotionValue<number> }) {
  return (
    <svg
      className="absolute inset-0"
      height={LETTER.height}
      viewBox={`0 0 ${String(LETTER.width)} ${String(LETTER.height)}`}
      width={LETTER.width}
    >
      <motion.rect
        fill="rgb(var(--sign-here-rgb) / 0.3)"
        height="15"
        rx="4"
        style={{ opacity: glow }}
        width="74"
        x="8"
        y="56"
      />
      <rect
        fill="var(--sign-here)"
        height="11"
        rx="2.5"
        width="11"
        x="12"
        y="59"
      />
      <path
        d="M15.2,62.2L19.8,66.8M19.8,62.2L15.2,66.8"
        fill="none"
        stroke="var(--sign-here-ink)"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="M27,69.5H78"
        fill="none"
        stroke="var(--paper-line-strong)"
        strokeLinecap="round"
        strokeWidth="1"
      />
    </svg>
  );
}
