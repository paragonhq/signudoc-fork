"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { applyThemePreference } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readIsDark() {
  return document.documentElement.classList.contains("dark");
}

/** Flips between light and dark; the choice is remembered in this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, readIsDark, () => false);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <SimpleTooltip label={label} side="bottom">
      <button
        aria-label={label}
        className={cn(
          "tactile inline-flex size-9 items-center justify-center rounded-full text-(--secondary) outline-none [--press-scale:0.92]",
          "hover:bg-(--hover) hover:text-(--fg) active:bg-(--press) focus-visible:shadow-(--focus-ring)",
          className,
        )}
        onClick={() => applyThemePreference(isDark ? "light" : "dark")}
        type="button"
      >
        <Icon aria-hidden="true" className="size-[1.125rem]" />
      </button>
    </SimpleTooltip>
  );
}
