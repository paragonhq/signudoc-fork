"use client";

import { ChevronDownIcon, MailIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

export type InvitationPreviewData = {
  /** The plain-text body for each deadline option, by number of days. */
  bodies: Record<string, string>;
  /** The stand-in signing link inside the bodies, drawn as a button. */
  linkPlaceholder: string;
  productName: string;
  subject: string;
  /** The first signer's address. */
  to: string;
};

type Block =
  | { kind: "button" }
  | { kind: "footer"; text: string }
  | { kind: "text"; text: string };

/**
 * The email's text in blocks: paragraphs, the signing link as a button,
 * and everything from the "do not need an account" line on as the quiet
 * footer. The words are the system's own (signing-invitation-email.ts).
 */
function toBlocks(body: string, linkPlaceholder: string): Block[] {
  const paragraphs = body.split(/\n{2,}/);
  let inFooter = false;

  return paragraphs.flatMap<Block>((paragraph) => {
    const text = paragraph.trim();

    if (!text) {
      return [];
    }

    if (text.includes(linkPlaceholder)) {
      return [{ kind: "button" }];
    }

    if (/account to sign/i.test(text)) {
      inFooter = true;
    }

    // Footer links ("Terms of Service:\nhttps://…") read as one line.
    return [
      inFooter
        ? { kind: "footer", text: text.replace(/:\n/g, ": ") }
        : { kind: "text", text },
    ];
  });
}

/**
 * What the first signer will find in their inbox: the subject always,
 * and the message itself one click away (the words the system sends,
 * with the deadline the sender has just chosen).
 */
export function InvitationPreview({
  deadlineDays,
  invitation,
}: {
  deadlineDays: number;
  invitation: InvitationPreviewData;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const body =
    invitation.bodies[String(deadlineDays)] ??
    Object.values(invitation.bodies)[0] ??
    "";

  return (
    <div className="flex flex-col">
      <button
        aria-controls={bodyId}
        aria-expanded={open}
        className={cn(
          "group/mail flex w-full items-start gap-3 rounded-(--radius-card) p-4 text-left outline-none sm:gap-4 sm:p-5",
          "transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-[rgb(var(--fg-rgb)/0.02)] focus-visible:shadow-(--focus-ring)",
          open && "rounded-b-none",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--accent-softer) text-(--accent-ink)"
        >
          <MailIcon className="size-[1.125rem]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.8125rem] leading-5 text-(--secondary)">
            Subject
          </span>
          <span className="text-[0.9375rem] leading-6 font-medium tracking-[-0.01em] text-pretty text-(--fg)">
            {invitation.subject}
          </span>
        </span>
        <span className="mt-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium text-(--accent-ink) transition-[background-color] duration-(--dur-hover) ease-(--ease-out) group-hover/mail:bg-(--accent-softer)">
          <span className="max-sm:sr-only">{open ? "Hide" : "Preview"}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-(--dur-move) ease-(--ease-out)",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                duration: exitDuration(DUR.panel),
                ease: EASE.exit,
              },
            }}
            id={bodyId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            key="body"
            transition={{ duration: DUR.panel, ease: EASE.out }}
          >
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="rounded-(--radius-well) bg-(--surface) p-2 sm:p-3">
                <article
                  aria-label="Email preview"
                  className="flex flex-col gap-4 rounded-[0.75rem] bg-(--paper) px-5 py-5 text-[0.875rem] leading-6 text-(--fg) shadow-(--shadow-thumb) sm:px-7 sm:py-6"
                >
                  <p className="text-[0.8125rem] leading-5 text-(--secondary)">
                    To <span className="text-(--fg)">{invitation.to}</span>
                  </p>
                  {toBlocks(body, invitation.linkPlaceholder).map(
                    (block, index) =>
                      block.kind === "button" ? (
                        // The HTML email shows the link as one button.
                        <span
                          className="inline-flex h-10 items-center self-start rounded-full bg-(--accent) px-5 text-sm font-medium text-(--on-accent)"
                          key={index}
                        >
                          Review and sign the document
                        </span>
                      ) : block.kind === "footer" ? (
                        <p
                          className="text-[0.8125rem] leading-5 whitespace-pre-line text-(--secondary)"
                          key={index}
                        >
                          {block.text}
                        </p>
                      ) : (
                        <p className="whitespace-pre-line" key={index}>
                          {block.text}
                        </p>
                      ),
                  )}
                </article>
              </div>
              <p className="mt-3 px-1 text-[0.8125rem] leading-5 text-(--secondary)">
                Each signer gets the same email, with their own link, when it’s
                their turn.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
