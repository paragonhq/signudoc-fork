"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { Envelope, type EnvelopeSend } from "@/components/objects";
import {
  StepHeading,
  useSetupReducedMotion,
} from "@/components/setup/setup-parts";
import { Check } from "@/components/ui/icons";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/*
 * The end of setup, and its one moment: the letter slides into the
 * envelope, the flap closes and the seal presses on. Then a short list of
 * what was set up, in words.
 */

export type DoneItem = { done: boolean; label: string };

export function SetupDoneStep({
  items,
  organizationName,
  signedIn,
}: {
  items: DoneItem[];
  organizationName: string;
  signedIn: boolean;
}) {
  const reduceMotion = useSetupReducedMotion();
  const [send, setSend] = useState<EnvelopeSend>("idle");

  useEffect(() => {
    const closing = window.setTimeout(() => setSend("closing"), 240);
    const sealed = window.setTimeout(() => setSend("sealed"), 720);

    return () => {
      window.clearTimeout(closing);
      window.clearTimeout(sealed);
    };
  }, []);

  const name = organizationName.trim();

  return (
    <div className="flex flex-col items-center gap-6">
      <div aria-hidden="true" className="flex justify-center pt-9 pb-1">
        <Envelope pose="active" scale={0.72} send={send} />
      </div>
      <StepHeading
        description={
          signedIn
            ? "Everything here can be changed later in Settings."
            : "Log in with the email and password you just chose."
        }
        title={name ? `${name} is ready` : "Your site is ready"}
      />
      <ul className="flex w-full flex-col gap-1 rounded-(--radius-well) bg-(--surface) p-2">
        {items.map((item, index) => (
          <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-[0.75rem] px-2.5 py-1.5 text-sm leading-5"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            key={item.label}
            transition={{
              delay: reduceMotion ? 0 : 0.5 + index * 0.05,
              duration: DUR.open,
              ease: EASE.out,
            }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                item.done
                  ? "bg-(--success-soft) text-(--success)"
                  : "bg-(--surface-strong) text-(--secondary)",
              )}
            >
              {item.done ? (
                <Check className="size-3.5" strokeWidth={2.25} />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span
              className={cn(
                "min-w-0",
                item.done ? "text-(--fg)" : "text-(--secondary)",
              )}
            >
              {item.label}
              {item.done ? null : <span className="sr-only"> (not yet)</span>}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
