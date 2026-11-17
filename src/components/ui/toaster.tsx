"use client";

import * as React from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  XIcon,
} from "@/components/ui/icons";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { useIsDesktop } from "@/components/ui/hooks";
import { Spinner } from "@/components/ui/spinner";

/*
 * Toasts confirm what just happened, out of the way:
 * a pill of layered paper (top highlight, hairline, contact and ambient
 * shadows), an icon and one line. Several stack like receipts: the ones
 * behind scale to .95 and .9, go blank and sit a shade darker, and fan
 * out on hover (globals.css, "Sonner stacking"). Bottom-right on desktop,
 * bottom-centre on a phone, where it clears the floating tab bar. Mounted
 * once in the root layout.
 *
 *   import { toast } from "@/components/ui/toaster";
 *   toast.success("Sent to 2 signers");
 *   toast.error("Couldn't send. Check your connection and try again.");
 *   toast("Draft saved", { action: { label: "Undo", onClick: undo } });
 *
 * Voice: say what happened, plainly; no exclamation marks. Errors say what
 * to do next.
 */
function Toaster(props: ToasterProps) {
  const isDesktop = useIsDesktop();

  return (
    <Sonner
      closeButton
      containerAriaLabel="Notifications"
      gap={8}
      icons={{
        close: <XIcon aria-hidden="true" className="size-3.5" />,
        error: <CircleAlert aria-hidden="true" className="size-4" />,
        info: <Info aria-hidden="true" className="size-4" />,
        loading: <Spinner className="size-4" />,
        success: <CircleCheck aria-hidden="true" className="size-4" />,
        warning: <TriangleAlert aria-hidden="true" className="size-4" />,
      }}
      mobileOffset={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
        left: 16,
        right: 16,
      }}
      offset={24}
      position={isDesktop ? "bottom-right" : "bottom-center"}
      swipeDirections={
        isDesktop ? ["right", "bottom"] : ["bottom", "left", "right"]
      }
      theme="light"
      toastOptions={{
        classNames: {
          actionButton:
            "tactile mat-tint order-last ml-auto inline-flex h-8 shrink-0 items-center rounded-full bg-(--accent-softer) px-3 text-[0.8125rem] font-medium text-(--accent-ink) outline-none hover:bg-(--accent-soft)",
          cancelButton:
            "tactile order-last inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[0.8125rem] font-medium text-(--secondary) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring)",
          closeButton:
            "absolute -top-1.5 -left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-(--paper) text-(--secondary) shadow-(--shadow-pop) opacity-0 outline-none transition-[opacity,color] duration-(--dur-hover) group-hover/toast:opacity-100 hover:text-(--fg) focus-visible:opacity-100 focus-visible:shadow-(--focus-ring) pointer-coarse:hidden",
          content: "flex min-w-0 flex-1 flex-col",
          description: "text-[0.8125rem] leading-5 text-(--secondary)",
          error: "[&_[data-icon]]:text-(--danger)",
          icon: "flex size-4 shrink-0 items-center justify-center text-(--secondary)",
          info: "[&_[data-icon]]:text-(--accent)",
          loading: "[&_[data-icon]]:text-(--secondary)",
          success: "[&_[data-icon]]:text-(--success)",
          title: "text-sm leading-5 font-medium tracking-[-0.01em] text-(--fg)",
          toast:
            "group/toast relative flex w-full items-center gap-3 rounded-[1.375rem] bg-(--paper) py-3 pr-3 pl-4 font-sans shadow-(--shadow-pop) sm:w-(--width)",
          warning: "[&_[data-icon]]:text-(--warning)",
        },
        unstyled: true,
      }}
      visibleToasts={3}
      {...props}
    />
  );
}

/** A quiet second line under a toast's title. */
function ToastMeta({ children }: { children: React.ReactNode }) {
  return <span className="block pt-0.5">{children}</span>;
}

export { ToastMeta, Toaster, toast };
