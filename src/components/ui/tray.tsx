"use client";

import * as React from "react";
import { TriangleAlert, XIcon } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Drawer } from "vaul";

import { cn } from "@/lib/cn";
import {
  useControllableState,
  useElementSize,
  useIsDesktop,
} from "@/components/ui/hooks";
import { IconButton } from "@/components/ui/icon-button";
import {
  DUR,
  EASE,
  exitDuration,
  SPRING_PANEL,
} from "@/components/ui/motion-tokens";

/*
 * Tray: the one dialog primitive, Family-style.
 * Layered paper (a top highlight, a hairline, contact and ambient
 * shadows), 28px corners, no borders. A header row with the
 * title and an icon button (close); one task per tray. When the content
 * changes height (a multi-step tray) the tray springs to the new height and
 * the steps slide in the direction of travel (TraySteps).
 *
 * Desktop (>= 640px): a centred Radix Dialog, 440px by default (560 for
 * rich content). Scale .96 to 1 with a small rise, over a fading overlay.
 * Phone: a Vaul drawer that floats 8px in from the screen edges (not
 * edge-to-edge), with a handle; drag it down to dismiss. Either way: focus
 * is trapped and returned, Escape and the overlay close it (unless
 * `dismissible={false}`).
 *
 * `tone="danger"` tints the header icon and (via ConfirmTray) the primary
 * button red, nothing more. `tone="seal"` is accepted and looks default.
 *
 *   <Tray open={open} onOpenChange={setOpen}>
 *     <TrayTrigger asChild><Button>Rename</Button></TrayTrigger>
 *     <TrayContent size="sm">
 *       <TrayHeader>
 *         <TrayTitle>Rename envelope</TrayTitle>
 *         <TrayDescription>Signers see this name in their email.</TrayDescription>
 *       </TrayHeader>
 *       <TrayBody>…fields…</TrayBody>
 *       <TrayFooter>
 *         <TrayClose asChild><Button variant="outline">Cancel</Button></TrayClose>
 *         <Button>Save name</Button>
 *       </TrayFooter>
 *     </TrayContent>
 *   </Tray>
 *
 * A TrayTitle is required (screen readers announce it); hide it with
 * `className="sr-only"` if the design has no visible title.
 */

type TrayMode = "dialog" | "drawer";
type TrayTone = "default" | "danger" | "seal";

type TrayContextValue = {
  dismissible: boolean;
  mode: TrayMode;
};

const TrayContext = React.createContext<TrayContextValue>({
  dismissible: true,
  mode: "dialog",
});

const TrayToneContext = React.createContext<TrayTone>("default");

/** Set by TrayHeader so its title and description can follow the band. */
const TrayInHeaderContext = React.createContext(false);

/** Set by TraySteps when it knows the total: the header says "Step 1 of 3". */
const TrayStepContext = React.createContext<{
  step: number;
  total: number;
} | null>(null);

function useTray() {
  return React.useContext(TrayContext);
}

type TrayProps = {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  /** When false, Escape, the overlay and dragging do not close it. */
  dismissible?: boolean;
  /**
   * Phone only: drag by the handle alone. Use it when the tray holds
   * something that is itself dragged, like the signature pad. (Or mark
   * that element with `data-vaul-no-drag`.)
   */
  handleOnly?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

function Tray({
  children,
  defaultOpen = false,
  dismissible = true,
  handleOnly = false,
  modal = true,
  onOpenChange,
  open: openProp,
}: TrayProps) {
  const isDesktop = useIsDesktop();
  const mode: TrayMode = isDesktop ? "dialog" : "drawer";
  // Owned here (not by Radix or Vaul) so the open state survives a resize
  // across the breakpoint, which swaps one root for the other.
  const [open, setOpen] = useControllableState({
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    value: openProp,
  });
  const context = React.useMemo(
    () => ({ dismissible, mode }),
    [dismissible, mode],
  );

  return (
    <TrayContext value={context}>
      {mode === "dialog" ? (
        <DialogPrimitive.Root
          data-slot="tray"
          modal={modal}
          onOpenChange={setOpen}
          open={open}
        >
          {children}
        </DialogPrimitive.Root>
      ) : (
        <Drawer.Root
          dismissible={dismissible}
          handleOnly={handleOnly}
          modal={modal}
          onOpenChange={setOpen}
          open={open}
        >
          {children}
        </Drawer.Root>
      )}
    </TrayContext>
  );
}

function TrayTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="tray-trigger" {...props} />;
}

function TrayClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="tray-close" {...props} />;
}

/**
 * Animates its own height to its content's. The inner box is capped by the
 * tray's max height, so long content scrolls inside TrayBody instead.
 */
function AutoHeight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [measure, size] = useElementSize<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ height: size ? size.height : "auto" }}
      className="max-h-[inherit] min-h-0 overflow-hidden"
      initial={false}
      transition={reduceMotion ? { duration: 0 } : SPRING_PANEL}
    >
      <div
        className={cn("relative flex max-h-[inherit] flex-col", className)}
        ref={measure}
      >
        {children}
      </div>
    </motion.div>
  );
}

const TRAY_SIZES = {
  sm: "sm:max-w-[25rem]",
  md: "sm:max-w-[27.5rem]",
  lg: "sm:max-w-[35rem]",
  xl: "sm:max-w-[50rem]",
} as const;

type TrayContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "asChild"
> & {
  /** Hide the corner close button (keep a Cancel in the footer then). */
  showCloseButton?: boolean;
  /** sm 400 · md 440 (default) · lg 560 · xl 800. Phone floats 8px inset. */
  size?: keyof typeof TRAY_SIZES;
  /**
   * `danger` tints the header glyph red (a warning glyph by default):
   * anything that cannot be undone. `seal` is accepted for older callers
   * and looks like `default`.
   */
  tone?: TrayTone;
};

function TrayContent({
  children,
  className,
  onEscapeKeyDown,
  onInteractOutside,
  showCloseButton = true,
  size = "md",
  tone = "default",
  ...props
}: TrayContentProps) {
  const { dismissible, mode } = useTray();
  const closeButton = showCloseButton ? (
    <DialogPrimitive.Close asChild>
      <IconButton
        aria-label="Close"
        className="absolute top-4 right-4 z-10 bg-(--surface) shadow-[var(--surface-highlight-dim),inset_0_0_0_1px_rgb(var(--fg-rgb)/0.04)] hover:bg-(--surface-strong) max-sm:top-5"
        size="sm"
        tooltip={false}
      >
        <XIcon />
      </IconButton>
    </DialogPrimitive.Close>
  ) : null;

  if (mode === "drawer") {
    return (
      <TrayToneContext value={tone}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-(--overlay)" />
          <Drawer.Content
            className={cn(
              "fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-(--radius-tray) bg-(--paper) text-sm text-(--fg) shadow-(--shadow-tray) outline-none",
              className,
            )}
            data-slot="tray-content"
            data-tone={tone}
            onEscapeKeyDown={onEscapeKeyDown}
            onInteractOutside={onInteractOutside}
            {...props}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-5 items-center justify-center"
            >
              <Drawer.Handle className="pointer-events-auto bg-[rgb(var(--fg-rgb)/0.14)]" />
            </div>
            <AutoHeight className="max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]">
              {children}
              {closeButton}
            </AutoHeight>
          </Drawer.Content>
        </Drawer.Portal>
      </TrayToneContext>
    );
  }

  return (
    <TrayToneContext value={tone}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="overlay-surface fixed inset-0 z-50 bg-(--overlay)"
          data-slot="tray-overlay"
        />
        <DialogPrimitive.Content
          className={cn(
            "tray-surface fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-(--radius-tray) bg-(--paper) text-sm text-(--fg) shadow-(--shadow-tray) outline-none",
            TRAY_SIZES[size],
            className,
          )}
          data-slot="tray-content"
          data-tone={tone}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event);

            if (!dismissible) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            onInteractOutside?.(event);

            if (!dismissible) {
              event.preventDefault();
            }
          }}
          {...props}
        >
          <AutoHeight className="max-h-[calc(100dvh-2rem)]">
            {children}
            {closeButton}
          </AutoHeight>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </TrayToneContext>
  );
}

function TrayHeader({
  children,
  className,
  icon,
  ...props
}: React.ComponentProps<"div"> & {
  /** A glyph beside the title. Danger trays get a warning glyph by default. */
  icon?: React.ReactNode;
}) {
  const tone = React.useContext(TrayToneContext);
  const steps = React.useContext(TrayStepContext);
  const danger = tone === "danger";
  const glyph = icon ?? (danger ? <TriangleAlert aria-hidden="true" /> : null);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-start gap-3 px-6 pt-6 pr-16 pb-2 max-sm:px-5 max-sm:pt-7 max-sm:pr-16",
        className,
      )}
      data-slot="tray-header"
      data-tone={tone}
      {...props}
    >
      {glyph ? (
        <span
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] shadow-[inset_0_0_0_1px_rgb(var(--fg-rgb)/0.05),var(--surface-highlight-dim)] [&_svg]:size-[1.125rem] [&_svg]:stroke-[1.75]",
            danger
              ? "bg-(--danger-soft) text-(--danger)"
              : "bg-(--surface) text-(--fg)",
          )}
        >
          {glyph}
        </span>
      ) : null}
      <TrayInHeaderContext value>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {steps ? (
            <p
              className="text-[0.8125rem] leading-5 font-medium text-(--secondary) tabular-nums"
              data-slot="tray-step-counter"
            >
              Step {steps.step + 1} of {steps.total}
            </p>
          ) : null}
          {children}
        </div>
      </TrayInHeaderContext>
    </div>
  );
}

function TrayTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-lg leading-7 font-semibold tracking-[-0.02em] text-balance text-(--fg)",
        className,
      )}
      data-slot="tray-title"
      {...props}
    />
  );
}

function TrayDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-[0.9375rem] leading-6 text-pretty text-(--secondary) [&_a]:text-(--accent-ink) [&_a]:underline [&_a]:underline-offset-4",
        className,
      )}
      data-slot="tray-description"
      {...props}
    />
  );
}

/** The scrolling middle. Long content scrolls here; header and footer stay. */
function TrayBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3 max-sm:px-5",
        className,
      )}
      data-slot="tray-body"
      {...props}
    />
  );
}

/**
 * Actions, primary last (rightmost on desktop, on top on a phone where
 * buttons go full width). Pass `divided` for a hairline above.
 */
function TrayFooter({
  className,
  divided = false,
  ...props
}: React.ComponentProps<"div"> & { divided?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 px-6 pt-4 pb-6 sm:flex-row sm:items-center sm:justify-end",
        "max-sm:px-5 max-sm:pb-5 max-sm:*:min-h-12 max-sm:*:w-full",
        divided && "border-t border-(--divider) pt-4",
        className,
      )}
      data-slot="tray-footer"
      {...props}
    />
  );
}

/**
 * Steps inside one tray: the old step leaves while the new one arrives from
 * the direction of travel, and the tray glides to the new height. Pass
 * `total` and each step's TrayHeader says "Step 1 of 3" above the title.
 *
 *   <TraySteps step={step} total={2}>{step === 0 ? <Choose /> : <Confirm />}</TraySteps>
 */
function TraySteps({
  children,
  className,
  step,
  total,
}: {
  children: React.ReactNode;
  className?: string;
  /** The current step, 0-based. */
  step: number;
  /** How many steps: TrayHeader then says "Step 1 of 3" above the title. */
  total?: number;
}) {
  const [previous, setPrevious] = React.useState(step);
  const [direction, setDirection] = React.useState(1);
  const counter = React.useMemo(
    () => (total ? { step, total } : null),
    [step, total],
  );

  if (step !== previous) {
    setDirection(step > previous ? 1 : -1);
    setPrevious(step);
  }

  return (
    <TrayStepContext value={counter}>
      <AnimatePresence custom={direction} initial={false} mode="popLayout">
        <motion.div
          animate={{
            filter: "blur(0px)",
            opacity: 1,
            transition: {
              default: { duration: DUR.open, ease: EASE.out },
              x: SPRING_PANEL,
            },
            x: 0,
          }}
          className={cn("flex min-h-0 flex-col", className)}
          custom={direction}
          exit="exit"
          initial="enter"
          key={step}
          variants={{
            enter: (travel: number) => ({
              filter: "blur(2px)",
              opacity: 0,
              x: 16 * travel,
            }),
            exit: (travel: number) => ({
              filter: "blur(2px)",
              opacity: 0,
              transition: { duration: exitDuration(DUR.open), ease: EASE.exit },
              x: -10 * travel,
            }),
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </TrayStepContext>
  );
}

export {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TraySteps,
  TrayTitle,
  TrayTrigger,
  useTray,
  type TrayContentProps,
  type TrayProps,
};
