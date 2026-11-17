"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Archive,
  Building2,
  ChevronsUpDown,
  DoorOpen,
  FileBadge2,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Palette,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Timer,
  UserRound,
  UserX,
  Users,
  type IconComponent,
} from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrefersReducedMotion } from "@/components/ui/hooks";
import { SPRING_SOFT } from "@/components/ui/motion-tokens";

/*
 * The settings navigation. Every section is on one page (so links such as
 * /settings#organization keep working and nothing is hidden from search
 * or tests); the navigation follows the scroll and jumps on click.
 *
 * Wide screens (≥1280): a calm list of groups, each item a simple icon in
 * a soft tinted tile, and one white pill that slides to the section in
 * view, the same feel as the app rail. Narrower: a sticky white pill that
 * names the section you are in; it opens a menu of every section.
 */

export type SettingsNavTint =
  "accent" | "blue" | "green" | "amber" | "neutral" | "danger";

export type SettingsNavItem = {
  icon: IconComponent;
  id: string;
  label: string;
  tint?: SettingsNavTint;
};

export type SettingsNavGroup = {
  id: string;
  items: SettingsNavItem[];
  label: string;
  tint: SettingsNavTint;
};

const TINTS: Record<SettingsNavTint, string> = {
  accent: "bg-(--accent-soft) text-(--accent-ink)",
  amber: "bg-(--signer-3-tint) text-(--signer-3)",
  blue: "bg-(--signer-1-tint) text-(--signer-1)",
  danger: "bg-(--danger-soft) text-(--danger)",
  green: "bg-(--signer-4-tint) text-(--signer-4)",
  neutral: "bg-(--surface-strong) text-(--secondary-strong)",
};

/** The sections on the page, in page order. Admin groups only for admins. */
export function buildSettingsNav({
  hosted,
  isAdmin,
}: {
  hosted: boolean;
  isAdmin: boolean;
}): SettingsNavGroup[] {
  const groups: SettingsNavGroup[] = [
    {
      id: "account",
      items: [
        { icon: UserRound, id: "profile", label: "Profile" },
        { icon: KeyRound, id: "password", label: "Password" },
        { icon: Smartphone, id: "two-step-sign-in", label: "Two-step sign-in" },
        { icon: MonitorSmartphone, id: "devices", label: "Signed-in devices" },
        {
          icon: DoorOpen,
          id: "close-account",
          label: "Close account",
          tint: "danger",
        },
      ],
      label: "Account",
      tint: "accent",
    },
  ];

  if (!isAdmin) {
    return groups;
  }

  groups.push(
    {
      id: "organization-group",
      items: [
        { icon: Building2, id: "organization", label: "General" },
        ...(hosted
          ? []
          : [{ icon: Palette, id: "branding", label: "Branding" }]),
        { icon: Mail, id: "email", label: "Email" },
        ...(hosted
          ? []
          : [{ icon: Scale, id: "legal-links", label: "Legal links" }]),
        { icon: Archive, id: "retention", label: "Retention" },
      ],
      label: "Organization",
      tint: "blue",
    },
    ...(hosted
      ? []
      : [
          {
            id: "access",
            items: [
              { icon: Users, id: "people", label: "People" },
              { icon: ShieldCheck, id: "security", label: "Sign-in security" },
              { icon: Timer, id: "session-limits", label: "Sessions" },
            ],
            label: "People & access",
            tint: "green" as const,
          },
        ]),
    {
      id: "compliance",
      items: [
        ...(hosted
          ? []
          : [
              { icon: ScrollText, id: "audit-trail", label: "Audit trail" },
              { icon: FileBadge2, id: "part11", label: "Part 11" },
            ]),
        { icon: UserX, id: "signer-data", label: "Signer data requests" },
      ],
      label: "Compliance",
      tint: "amber",
    },
    {
      id: "system",
      items: [{ icon: RefreshCw, id: "signudoc", label: "Updates" }],
      label: "System",
      tint: "neutral",
    },
  );

  return groups;
}

function IconTile({
  className,
  icon: Icon,
  tint,
}: {
  className?: string;
  icon: IconComponent;
  tint: SettingsNavTint;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[0.5rem]",
        TINTS[tint],
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** Where a section's top lands under the sticky chrome, per breakpoint. */
function readTopOffset() {
  if (window.matchMedia("(min-width: 1280px)").matches) {
    return 40;
  }

  return window.matchMedia("(min-width: 1024px)").matches ? 96 : 128;
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0] ?? "");
  // While a jump scrolls the page, the spy waits so the pill goes straight
  // to the target instead of ticking through every section on the way.
  const lockedUntil = useRef(0);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    const aliases: Record<string, string> = {
      "email-setup": "email",
    };
    const target = aliases[fromHash] ?? fromHash;

    if (!target || !ids.includes(target)) {
      return;
    }

    // After the browser's own jump to the hash has settled. The page
    // streams in after the browser has looked for the anchor, so the jump
    // is made here when the browser could not make it.
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(target);

      if (
        element &&
        Math.abs(element.getBoundingClientRect().top - readTopOffset()) > 24
      ) {
        element.scrollIntoView({ block: "start" });
      }

      setActive(target);
    });

    return () => cancelAnimationFrame(frame);
  }, [ids]);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) {
      return;
    }

    function pick() {
      if (Date.now() < lockedUntil.current) {
        return;
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;

      if (atBottom && window.scrollY > 0) {
        setActive(elements[elements.length - 1].id);
        return;
      }

      // The current section is the last one whose top has passed a line a
      // little under the sticky chrome (a quarter of the way down at most).
      const line = Math.min(
        readTopOffset() + 96,
        window.innerHeight * 0.25 + readTopOffset(),
      );
      let current = elements[0];

      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line) {
          current = element;
        } else {
          break;
        }
      }

      setActive(current.id);
    }

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(pick);
    };

    frame = requestAnimationFrame(pick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);

  const lock = useCallback((id: string) => {
    lockedUntil.current = Date.now() + 900;
    setActive(id);

    const release = () => {
      lockedUntil.current = 0;
    };

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", release, { once: true });
    }
  }, []);

  return { active, lock };
}

export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const ids = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.id)),
    [groups],
  );
  const { active, lock } = useScrollSpy(ids);

  const jumpTo = useCallback(
    (id: string, viaKeyboard = false) => {
      const target = document.getElementById(id);

      if (!target) {
        return;
      }

      lock(id);
      target.scrollIntoView({
        behavior: reducedMotion || viaKeyboard ? "auto" : "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", `#${id}`);
      // Keyboard and screen reader users land in the section they chose.
      target.focus({ preventScroll: true });
    },
    [lock, reducedMotion],
  );

  const activeGroup =
    groups.find((group) => group.items.some((item) => item.id === active)) ??
    groups[0];
  const activeItem =
    activeGroup?.items.find((item) => item.id === active) ??
    activeGroup?.items[0];

  return (
    <>
      {/* Wide screens: a calm list with one sliding white pill. */}
      <nav
        aria-label="Settings sections"
        className="sticky top-10 hidden max-h-[calc(100dvh-5rem)] self-start overflow-y-auto overscroll-contain px-1 pb-6 [scrollbar-width:none] xl:block"
      >
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div className="flex flex-col gap-1" key={group.id}>
              <p
                className="px-3 pb-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)"
                id={`settings-nav-${group.id}`}
              >
                {group.label}
              </p>
              <ul
                aria-labelledby={`settings-nav-${group.id}`}
                className="flex flex-col gap-0.5"
              >
                {group.items.map((item) => {
                  const isActive = item.id === active;

                  return (
                    <li className="relative" key={item.id}>
                      {isActive ? (
                        <motion.span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-(--paper) shadow-(--shadow-thumb)"
                          layoutId="settings-nav-pill"
                          transition={
                            reducedMotion ? { duration: 0 } : SPRING_SOFT
                          }
                        />
                      ) : null}
                      <a
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "relative flex h-10 items-center gap-3 rounded-full pr-3 pl-1.5 text-sm font-medium outline-none",
                          "transition-[color,background-color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.98]",
                          "focus-visible:shadow-(--focus-ring)",
                          isActive
                            ? "text-(--fg)"
                            : "text-(--secondary) hover:bg-(--hover) hover:text-(--fg)",
                        )}
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          // detail is 0 for a keyboard "click".
                          jumpTo(item.id, event.detail === 0);
                        }}
                      >
                        <IconTile
                          className="rounded-full"
                          icon={item.icon}
                          tint={item.tint ?? group.tint}
                        />
                        <span className="truncate">{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Phone, tablet and small laptops: where you are, in one pill. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-5 mb-8 bg-[rgb(var(--page-rgb)/0.86)] px-5 py-2 backdrop-blur-xl backdrop-saturate-150 sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-10 lg:px-10 lg:py-3 xl:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Jump to section. Current: ${activeItem?.label ?? "Settings"}`}
              className="relative flex h-12 w-full items-center gap-3 rounded-full bg-(--paper) pr-4 pl-2.5 text-left shadow-(--shadow-card-flat) outline-none transition-[scale] duration-(--dur-press) ease-(--ease-out) focus-visible:shadow-(--focus-ring) active:scale-[0.99] sm:max-w-sm"
              type="button"
            >
              {activeItem ? (
                <IconTile
                  className="rounded-full"
                  icon={activeItem.icon}
                  tint={activeItem.tint ?? activeGroup.tint}
                />
              ) : null}
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="truncate text-[0.9375rem] font-medium tracking-[-0.01em] text-(--fg)">
                  {activeItem?.label ?? "Settings"}
                </span>
                {activeGroup && groups.length > 1 ? (
                  <span className="truncate text-[0.8125rem] text-(--secondary)">
                    {activeGroup.label}
                  </span>
                ) : null}
              </span>
              <ChevronsUpDown
                aria-hidden="true"
                className="size-4 shrink-0 text-(--secondary)"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="max-h-[min(70dvh,var(--radix-dropdown-menu-content-available-height))] rounded-[1.625rem]"
            collisionPadding={16}
            sideOffset={8}
          >
            <DropdownMenuRadioGroup
              onValueChange={(value) => jumpTo(value)}
              value={active}
            >
              {groups.map((group, index) => (
                <DropdownMenuGroup key={group.id}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  {groups.length > 1 ? (
                    <DropdownMenuLabel className="px-2.5 pt-2 pb-1 text-xs font-medium text-(--secondary)">
                      {group.label}
                    </DropdownMenuLabel>
                  ) : null}
                  {group.items.map((item) => (
                    <DropdownMenuRadioItem
                      className="min-h-10 gap-3 rounded-full pl-1.5"
                      key={item.id}
                      value={item.id}
                    >
                      <IconTile
                        className="rounded-full"
                        icon={item.icon}
                        tint={item.tint ?? group.tint}
                      />
                      <span className="truncate">{item.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
