"use client";

import { KeyboardIcon, PenLineIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Segmented } from "@/components/ui/segmented";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";

import {
  TYPED_SIGNATURE_FONT,
  getSignerInitials,
  type SignatureEntry,
  type SignatureKind,
} from "./field-logic";
import { SignaturePad, SignatureLine } from "./signature-pad";

type Mode = "drawn" | "typed";

export type SignatureTrayRequest = {
  /** A typed signature also adopts initials (the document asks for some). */
  adoptsInitials?: boolean;
  existingEntry?: SignatureEntry;
  fieldId: string;
  kind: SignatureKind;
  mode: Mode;
};

/**
 * Adopt a signature: type it (it shows large, in the signature face, on a
 * yellow sign line) or draw it on the pad. Apply closes the tray and the
 * signature writes itself into the field; later fields take it with one
 * tap. A phone gets it as a floating tray that drags by its handle only,
 * so drawing never pulls it down.
 */
export function SignatureTray({
  onApply,
  onClose,
  request,
  signerName,
}: {
  onApply: (entry: SignatureEntry) => void;
  onClose: () => void;
  request: SignatureTrayRequest | null;
  signerName: string;
}) {
  // Keep showing the last request while the tray animates out.
  const [lastRequest, setLastRequest] = useState(request);

  if (request && request !== lastRequest) {
    setLastRequest(request);
  }

  const shown = request ?? lastRequest;

  return (
    <Tray
      handleOnly
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={request !== null}
    >
      <TrayContent size="lg">
        {shown ? (
          <SignatureTrayInner
            key={shown.fieldId}
            onApply={onApply}
            request={shown}
            signerName={signerName}
          />
        ) : (
          <TrayHeader>
            <TrayTitle>Add your signature</TrayTitle>
          </TrayHeader>
        )}
      </TrayContent>
    </Tray>
  );
}

function SignatureTrayInner({
  onApply,
  request,
  signerName,
}: {
  onApply: (entry: SignatureEntry) => void;
  request: SignatureTrayRequest;
  signerName: string;
}) {
  const { existingEntry, kind } = request;
  const isInitials = kind === "initials";
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>(request.mode);
  // Type is on the left, Draw on the right: the face slides from that side.
  const [direction, setDirection] = useState(0);
  const [typedValue, setTypedValue] = useState(() =>
    existingEntry?.inputMethod === "typed" && existingEntry.value.trim()
      ? existingEntry.value
      : isInitials
        ? getSignerInitials(signerName)
        : signerName,
  );
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(
    existingEntry?.inputMethod === "drawn"
      ? (existingEntry.imageDataUrl ?? null)
      : null,
  );
  const typed = typedValue.trim();
  const showInitials = Boolean(request.adoptsInitials) && !isInitials;
  const canApply = mode === "typed" ? typed.length > 0 : Boolean(drawnDataUrl);
  const faceVariants = {
    enter: (travel: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { filter: "blur(2px)", opacity: 0, x: 24 * travel },
    exit: (travel: number) =>
      reduceMotion
        ? { opacity: 0, transition: { duration: 0.1 } }
        : {
            filter: "blur(2px)",
            opacity: 0,
            transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
            x: -16 * travel,
          },
    rest: {
      filter: "blur(0px)",
      opacity: 1,
      transition: { duration: DUR.open, ease: EASE.out },
      x: 0,
    },
  };

  function apply() {
    if (!canApply) {
      return;
    }

    onApply(
      mode === "drawn"
        ? {
            imageDataUrl: drawnDataUrl,
            inputMethod: "drawn",
            value: isInitials ? "Drawn initials" : "Drawn signature",
          }
        : { imageDataUrl: null, inputMethod: "typed", value: typed },
    );
  }

  return (
    <>
      <TrayHeader>
        <TrayTitle>
          {isInitials ? "Add your initials" : "Add your signature"}
        </TrayTitle>
        <TrayDescription>
          It counts as your legal signature, the same as one in ink.
        </TrayDescription>
      </TrayHeader>

      <TrayBody className="flex flex-col gap-4 overflow-x-hidden pt-2">
        <Segmented<Mode>
          aria-label={isInitials ? "How to initial" : "How to sign"}
          fill
          items={[
            {
              icon: <KeyboardIcon aria-hidden="true" />,
              label: "Type",
              value: "typed",
            },
            {
              icon: <PenLineIcon aria-hidden="true" />,
              label: "Draw",
              value: "drawn",
            },
          ]}
          onValueChange={(next) => {
            setDirection(next === "drawn" ? 1 : -1);
            setMode(next);
          }}
          value={mode}
        />

        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          {mode === "typed" ? (
            <motion.div
              animate="rest"
              className="flex flex-col gap-4"
              custom={direction}
              exit="exit"
              initial="enter"
              key="typed"
              variants={faceVariants}
            >
              {showInitials ? (
                <AdoptPreview
                  initials={getSignerInitials(typed)}
                  name={typed}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="relative h-44 overflow-hidden rounded-(--radius-well) bg-(--surface) sm:h-48"
                >
                  <p
                    className="absolute inset-x-0 bottom-[calc(24%+0.25rem)] truncate px-7 text-[clamp(2.5rem,11vw,3.5rem)] leading-[1.3] text-(--fg) sm:px-9"
                    style={{ fontFamily: TYPED_SIGNATURE_FONT }}
                  >
                    {typed || (
                      <span className="text-(--placeholder)">
                        {isInitials ? "Your initials" : "Your name"}
                      </span>
                    )}
                  </p>
                  <SignatureLine />
                </div>
              )}
              <FormField
                label={isInitials ? "Type your initials" : "Type your name"}
              >
                <Input
                  autoComplete={isInitials ? "off" : "name"}
                  className="h-11 text-base"
                  maxLength={isInitials ? 4 : 80}
                  name={`signature-${kind}`}
                  onChange={(event) =>
                    setTypedValue(
                      isInitials
                        ? event.target.value.toUpperCase().slice(0, 4)
                        : event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      apply();
                    }
                  }}
                  value={typedValue}
                />
              </FormField>
              <p className="-mt-1 text-[0.8125rem] leading-5 text-(--secondary)">
                {showInitials
                  ? "Used for every signature and initials field in this document."
                  : isInitials
                    ? "Used for every initials field in this document."
                    : "Used for every signature in this document."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              animate="rest"
              custom={direction}
              exit="exit"
              initial="enter"
              key="drawn"
              variants={faceVariants}
            >
              <SignaturePad
                initialDataUrl={drawnDataUrl}
                isInitials={isInitials}
                onChange={setDrawnDataUrl}
              />
              <p className="mt-2 text-[0.8125rem] leading-5 text-(--secondary)">
                Use your finger, a pen or the mouse.{" "}
                {isInitials
                  ? "Used for every initials field here."
                  : "Used for every signature here."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </TrayBody>

      <TrayFooter>
        <TrayClose asChild>
          <Button variant="ghost">Cancel</Button>
        </TrayClose>
        <Button disabled={!canApply} onClick={apply} size="lg">
          {isInitials ? "Apply initials" : "Apply signature"}
        </Button>
      </TrayFooter>
    </>
  );
}

/**
 * Adopting a typed signature for a document that also asks for initials:
 * both side by side, the way a pen signer would set them down, each on its
 * own yellow sign line.
 */
function AdoptPreview({ initials, name }: { initials: string; name: string }) {
  return (
    <div
      aria-hidden="true"
      className="grid h-44 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-(--radius-well) bg-(--surface) sm:h-48"
    >
      <AdoptCell chars={name.length || 9} label="Signature">
        {name || <span className="text-(--placeholder)">Your name</span>}
      </AdoptCell>
      <AdoptCell
        chars={3}
        className="w-28 shadow-[inset_1px_0_0_rgb(var(--fg-rgb)/0.07)] sm:w-36"
        label="Initials"
      >
        {initials || <span className="text-(--placeholder)">AB</span>}
      </AdoptCell>
    </div>
  );
}

function AdoptCell({
  chars,
  children,
  className,
  label,
}: {
  /** Letters to fit on the line: the face shrinks for a long name. */
  chars: number;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn("relative min-w-0 [container-type:size]", className)}
      style={{ "--chars": Math.max(chars, 3) } as CSSProperties}
    >
      <span className="absolute top-3.5 left-5 text-xs leading-4 font-medium text-(--secondary) sm:left-6">
        {label}
      </span>
      <p
        className="absolute inset-x-0 bottom-[calc(24%+0.25rem)] truncate px-5 text-[min(3rem,calc(170cqw/var(--chars)))] leading-[1.3] text-(--fg) sm:px-6"
        style={{ fontFamily: TYPED_SIGNATURE_FONT }}
      >
        {children}
      </p>
      <span className="pointer-events-none absolute inset-x-5 bottom-[24%] h-[3px] rounded-full bg-(--sign-here) shadow-[0_1px_0_rgb(var(--fg-rgb)/0.12)] sm:inset-x-6" />
    </div>
  );
}
