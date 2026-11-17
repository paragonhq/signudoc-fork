"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import { useElementSize } from "@/components/ui/hooks";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";

const subscribeNever = () => () => {};

/**
 * Splits a label into letters keyed by character and occurrence, so the
 * letters two labels share keep their identity: "Send" → "Sending…" keeps
 * S, e, n, d; "Sent" keeps S, e, n.
 */
function splitLetters(text: string) {
  const seen = new Map<string, number>();

  return Array.from(text).map((char) => {
    const count = seen.get(char) ?? 0;

    seen.set(char, count + 1);

    return { char, key: `${char}-${count}` };
  });
}

/**
 * Animates a label that changes meaning (Send → Sending… → Sent, Sign →
 * Signed, Save → Saved). Shared letters slide to their new place, the rest
 * blur in and out, and the width glides so the button around it does not
 * jump. Screen readers get the plain text once. With reduced motion the
 * label cross-fades in place.
 *
 *   <Button loading={sending}><TextMorph>{sent ? "Sent" : sending ? "Sending…" : "Send"}</TextMorph></Button>
 */
function TextMorph({
  children,
  className,
  live = false,
}: {
  children: string;
  className?: string;
  /** Announce changes politely (for status text, not button labels). */
  live?: boolean;
}) {
  const letters = React.useMemo(() => splitLetters(children), [children]);
  const [measure, size] = useElementSize<HTMLSpanElement>();
  // The server cannot know the visitor's motion setting, so the first render
  // always takes the letter path; the reduced path takes over after mount.
  // Reading it straight away broke hydration for reduced-motion visitors.
  const prefersReducedMotion = useReducedMotion();
  const mounted = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const reduceMotion = mounted && prefersReducedMotion;

  return (
    <span
      aria-live={live ? "polite" : undefined}
      className={cn("relative inline-flex", className)}
      data-slot="text-morph"
    >
      <span className="sr-only">{children}</span>
      <motion.span
        animate={{ width: size ? size.width : "auto" }}
        aria-hidden="true"
        className="inline-flex overflow-visible"
        initial={false}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: DUR.move, ease: EASE.inOut }
        }
      >
        <span className="relative inline-flex whitespace-pre" ref={measure}>
          {reduceMotion ? (
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: DUR.press } }}
                initial={{ opacity: 0 }}
                key={children}
                transition={{ duration: DUR.hover }}
              >
                {children}
              </motion.span>
            </AnimatePresence>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {letters.map(({ char, key }) => (
                <motion.span
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  className="inline-block"
                  exit={{
                    filter: "blur(3px)",
                    opacity: 0,
                    transition: {
                      duration: exitDuration(DUR.open),
                      ease: EASE.exit,
                    },
                  }}
                  initial={{ filter: "blur(3px)", opacity: 0 }}
                  key={key}
                  layout="position"
                  transition={{ duration: DUR.open, ease: EASE.out }}
                >
                  {char === " " ? " " : char}
                </motion.span>
              ))}
            </AnimatePresence>
          )}
        </span>
      </motion.span>
    </span>
  );
}

export { TextMorph };
