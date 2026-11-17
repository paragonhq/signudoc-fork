"use client";

import { ChevronDownIcon, SearchIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useCommandMenu } from "@/components/command/command-menu";
import { AccountMenu, type ShellUser } from "@/components/layout/account-menu";
import { PlateBrand } from "@/components/layout/brand";
import {
  newChoices,
  resolveSection,
  topNavItems,
  type NewChoice,
} from "@/components/layout/nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlide } from "@/components/ui/glide";
import { useIsApplePlatform } from "@/components/ui/hooks";
import { Kbd } from "@/components/ui/kbd";
import { SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

/** True once the page has scrolled under the bar. False on the server. */
export function useScrolledPast(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}

/** Classes for the bar: flat on the page, a hairline and blur once scrolled. */
export const barSurfaceClassName = cn(
  "sticky top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-(--dur-panel) ease-(--ease-out)",
  "bg-(--page) data-scrolled:bg-[rgb(var(--page-rgb)/0.78)] data-scrolled:shadow-[0_1px_0_rgb(var(--fg-rgb)/0.07)] data-scrolled:backdrop-blur-xl data-scrolled:backdrop-saturate-150",
);

export function DesktopTopBar({
  pathname,
  user,
}: {
  pathname: string;
  user: ShellUser;
}) {
  const scrolled = useScrolledPast();
  const { openMenu } = useCommandMenu();
  const isApple = useIsApplePlatform();
  const section = resolveSection(pathname);

  return (
    <header
      className={cn(barSurfaceClassName, "hidden lg:block")}
      data-scrolled={scrolled ? "" : undefined}
    >
      <div className="mx-auto flex h-16 w-full max-w-[calc(75rem+5rem)] items-center gap-8 px-10">
        <PlateBrand className="shrink-0" href="/dashboard" />

        <TopNav section={section} />

        <div className="ml-auto flex items-center gap-2">
          <button
            aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
            className={cn(
              // Raised paper, like a field you can press: a highlight, a
              // hairline, a contact shadow and a keycap for the shortcut.
              "group/search tactile mat-raised inline-flex h-9 w-56 items-center gap-2.5 rounded-full bg-(--paper) pr-1.5 pl-3.5 text-sm text-(--secondary) outline-none [--press-scale:0.98] xl:w-64",
              "hover:bg-(--paper-hover) hover:text-(--fg)",
            )}
            onClick={() => openMenu()}
            type="button"
          >
            <SearchIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <Kbd aria-hidden="true">{isApple ? "⌘K" : "Ctrl K"}</Kbd>
          </button>

          <NewMenu />

          <ThemeToggle />

          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/**
 * The places, as quiet text tabs. One raised paper pill (highlight,
 * hairline, contact shadow) marks where you are and springs across when
 * you move, stretching toward the place you picked (ui/glide.tsx); a faint
 * pill follows the pointer so you can see what a click would do. Until
 * the page hydrates, a static pill sits under the current tab so the
 * first paint already shows where you are.
 */
function TopNav({ section }: { section: ReturnType<typeof resolveSection> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const thumb = useGlide(
    listRef,
    thumbRef,
    {
      attributes: ["aria-current"],
      axis: "x",
      selector: '[aria-current="page"]',
      stretch: true,
    },
    [section],
  );

  return (
    <nav aria-label="Workspace">
      <LayoutGroup id="shell-top-nav">
        <ul
          className="group/nav relative isolate flex items-center gap-1"
          onPointerLeave={() => setHovered(null)}
          ref={listRef}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 -z-10 rounded-full bg-(--paper) shadow-(--shadow-thumb) will-change-transform"
            data-slot="shell-nav-thumb"
            ref={thumbRef}
            style={{
              opacity: thumb.opacity,
              width: thumb.size,
              x: thumb.position,
            }}
          />
          {topNavItems.map((item) => {
            const isActive = item.section === section;

            return (
              <li className="relative" key={item.href}>
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-(--paper) shadow-(--shadow-thumb) group-data-glide-ready/nav:hidden"
                  />
                ) : null}
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "tactile relative z-10 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium outline-none [--press-scale:0.96]",
                    "focus-visible:shadow-(--focus-ring)",
                    isActive
                      ? "text-(--fg)"
                      : "text-(--secondary) hover:text-(--fg)",
                  )}
                  href={item.href}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") {
                      setHovered(item.href);
                    }
                  }}
                >
                  {item.label}
                </Link>
                {hovered === item.href && !isActive ? (
                  <motion.span
                    animate={{ opacity: 1 }}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-(--hover)"
                    initial={{ opacity: 0 }}
                    layoutId="shell-nav-hover"
                    transition={SPRING_SNAPPY}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

/** The violet "New" and its three choices. */
function NewMenu() {
  const { openMenu } = useCommandMenu();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group/new tactile mat-fill inline-flex h-9 items-center gap-1.5 rounded-full bg-(--accent) pr-3 pl-4 text-sm font-medium text-(--on-accent) outline-none",
            "hover:bg-(--accent-hover) data-[state=open]:bg-(--accent-hover)",
          )}
          type="button"
        >
          New
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 opacity-80 transition-transform duration-(--spring-thumb-dur) ease-(--spring-thumb) group-data-[state=open]/new:rotate-180"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72" sideOffset={8}>
        {newChoices.map((choice) =>
          choice.id === "use-template" ? (
            <DropdownMenuItem
              className="items-start py-2"
              key={choice.id}
              onSelect={() => openMenu("templates")}
            >
              <NewChoiceRow choice={choice} />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              asChild
              className="items-start py-2"
              key={choice.id}
            >
              <Link href={choice.href}>
                <NewChoiceRow choice={choice} />
              </Link>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One choice: a soft icon tile, the name and a line on what it does. The
 * description is hidden from the accessible name so the item is called
 * exactly what it does ("New envelope").
 */
export function NewChoiceRow({
  choice,
  size = "md",
}: {
  choice: NewChoice;
  size?: "md" | "lg";
}) {
  const Icon = choice.icon;

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[0.625rem] shadow-[var(--surface-highlight-dim),inset_0_0_0_1px_rgb(var(--fg-rgb)/0.05)]",
          choice.id === "envelope"
            ? "bg-(--accent-soft) text-(--accent-ink)"
            : "bg-(--surface) text-(--fg)",
          size === "lg" ? "size-11 rounded-(--radius-well)" : "size-8",
        )}
      >
        <Icon className={size === "lg" ? "size-5" : "size-4"} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "font-medium text-(--fg)",
            size === "lg" ? "text-[0.9375rem]" : "text-sm",
          )}
        >
          {choice.label}
        </span>
        <span
          aria-hidden="true"
          className="text-[0.8125rem] leading-5 text-(--secondary)"
        >
          {choice.description}
        </span>
      </span>
    </>
  );
}
