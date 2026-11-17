"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { CheckIcon } from "@/components/ui/icons";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

import { DoneSeal } from "./frame/done-seal";
import { readReceipt, type StoredReceipt } from "./frame/receipt-storage";
import { SigningFrame } from "./frame/signing-frame";

const fallbackEnvelopeTitle = "this document";

type SigningDoneShellProps = {
  envelopeTitle?: string | null;
  /** "17 NOV 2026", formatted on the server (formatSealDate). */
  signedOn: string;
  /** The signing link, to find the receipt the signing view left. */
  token?: string;
};

type Step = {
  done: boolean;
  label: ReactNode;
  note?: ReactNode;
};

/**
 * The finish line: the seal (the one delight of the journey, already in
 * place when the seal moment hands over), then a receipt in the calm
 * sense. What was signed and when, what happens next in three short steps,
 * and the signed copy once there is one. Holds for a first signer and a
 * last one alike.
 */
export function SigningDoneShell({
  envelopeTitle,
  signedOn,
  token,
}: SigningDoneShellProps) {
  const [receipt, setReceipt] = useState<StoredReceipt | null>(null);

  useEffect(() => {
    if (token) {
      // Browser storage is only there after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReceipt(readReceipt(token));
    }
  }, [token]);

  const isComplete = receipt?.isLastSigner ?? false;
  const nextSignerName = receipt?.nextSignerName ?? null;
  const signedAt = receipt?.signedAt ?? null;
  const rawTitle = receipt?.title ?? envelopeTitle;
  const title =
    rawTitle && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : fallbackEnvelopeTitle;
  const hasTitle = title !== fallbackEnvelopeTitle;

  const steps: Step[] = [
    {
      done: true,
      label: "You signed",
      note: signedAt ? <LocalTime iso={signedAt} /> : null,
    },
    isComplete
      ? { done: true, label: "Everyone has signed" }
      : nextSignerName
        ? {
            done: false,
            label: `${nextSignerName} signs next`,
            note: "We've let them know",
          }
        : {
            done: false,
            label: "Anyone else signs",
            note: "If others need to sign, we let them know",
          },
    {
      done: isComplete,
      label: isComplete
        ? "Your signed copy is on its way"
        : "Everyone gets the signed copy",
      note: "By email, to keep as your record",
    },
  ];

  // MotionConfig skips the rise under reduced motion; the fade stays.
  const rise = (delay: number) => ({
    animate: { opacity: 1, y: 0 },
    initial: { opacity: 0, y: 8 },
    transition: { delay, duration: DUR.panel, ease: EASE.out },
  });

  return (
    <SigningFrame mainClassName="justify-start pt-[max(2rem,10vh)]">
      <section
        aria-labelledby="signing-done-title"
        className="flex w-full max-w-[28rem] flex-col items-center text-center"
      >
        <DoneSeal signedOn={signedOn} />
        <h1
          className="mt-8 text-[1.75rem] leading-9 font-semibold tracking-[-0.03em] text-balance text-(--fg) max-sm:text-2xl"
          id="signing-done-title"
        >
          You&apos;re done
        </h1>
        <motion.p
          className="mt-2 text-[0.9375rem] leading-6 text-pretty text-(--secondary)"
          {...rise(0.15)}
        >
          Your signature on{" "}
          <span className="font-medium text-(--fg)">
            {hasTitle ? <>&ldquo;{title}&rdquo;</> : title}
          </span>{" "}
          is recorded.
        </motion.p>

        <motion.div
          className="mt-8 w-full rounded-(--radius-card) bg-(--paper) p-2 text-left shadow-(--shadow-card)"
          {...rise(0.3)}
        >
          <h2 className="px-4 pt-3 pb-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)">
            What happens next
          </h2>
          <ol className="flex flex-col px-4 pt-2 pb-3">
            {steps.map((step, index) => (
              <li className="relative flex gap-3.5 pb-4 last:pb-0" key={index}>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-7 bottom-1 left-[0.6875rem] w-px",
                      step.done && steps[index + 1]?.done
                        ? "bg-[rgb(var(--success-rgb)/0.35)]"
                        : "bg-(--divider)",
                    )}
                  />
                ) : null}
                <StepDot done={step.done} />
                <span className="flex min-w-0 flex-col pt-px">
                  <span className="text-[0.9375rem] leading-6 font-medium text-(--fg)">
                    {step.label}
                    <span className="sr-only">
                      {step.done ? ", done" : ", to come"}
                    </span>
                  </span>
                  {step.note ? (
                    <span className="text-[0.8125rem] leading-5 text-(--secondary)">
                      {step.note}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.p
          className="mt-6 text-[0.8125rem] leading-5 text-(--secondary)"
          {...rise(0.45)}
        >
          You can close this tab.
        </motion.p>
      </section>
    </SigningFrame>
  );
}

function StepDot({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-1 mt-0.5 inline-flex size-[1.375rem] shrink-0 items-center justify-center rounded-full",
        done
          ? "bg-(--success) text-(--on-accent)"
          : "bg-(--paper) shadow-[inset_0_0_0_1.5px_rgb(var(--fg-rgb)/0.18)]",
      )}
    >
      {done ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

/** The signer's own clock: the server cannot know their time zone. */
function LocalTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const label = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  );
}
