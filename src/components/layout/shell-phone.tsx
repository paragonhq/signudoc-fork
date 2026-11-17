"use client";

import { EllipsisIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { AppIcon } from "@/components/brand/marks";
import { useCommandMenu } from "@/components/command/command-menu";
import { AccountMenu, type ShellUser } from "@/components/layout/account-menu";
import { useBranding } from "@/components/layout/branding-provider";
import {
  newChoices,
  phoneMoreItems,
  phoneTabItems,
  sectionTitle,
  type ShellNavItem,
  type ShellSection,
} from "@/components/layout/nav-items";
import {
  barSurfaceClassName,
  NewChoiceRow,
  useScrolledPast,
} from "@/components/layout/shell-top-bar";
import { DUR, EASE } from "@/components/ui/motion-tokens";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayHeader,
  TrayTitle,
  TrayTrigger,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";

/**
 * The phone's top bar: the app icon, a title and the account. At the top
 * of a page the title is the organization (the page says its own name in
 * large type just below); once that large title scrolls away, the bar's
 * title cross-fades to the page's name, as on iOS. Moving to another
 * place cross-fades it too. Flat until the page scrolls under it.
 */
export function PhoneTopBar({
  pathname,
  user,
}: {
  pathname: string;
  user: ShellUser;
}) {
  const scrolled = useScrolledPast();
  const pastTitle = useScrolledPast(64);
  const { productName } = useBranding();
  const pageTitle = sectionTitle(pathname);
  const title = pastTitle && pageTitle ? pageTitle : productName;

  return (
    <header
      className={cn(
        barSurfaceClassName,
        "pt-[env(safe-area-inset-top)] lg:hidden",
      )}
      data-scrolled={scrolled ? "" : undefined}
    >
      <div className="flex h-14 items-center gap-3 px-4 sm:px-8">
        <Link
          aria-label={productName}
          className="shrink-0 rounded-[0.5rem] outline-none focus-visible:shadow-(--focus-ring)"
          href="/dashboard"
        >
          <AppIcon className="size-7 rounded-[0.5rem]" />
        </Link>
        <div
          aria-hidden="true"
          className="relative h-6 min-w-0 flex-1 overflow-hidden"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 truncate text-[0.9375rem] leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
              exit={{
                opacity: 0,
                transition: { duration: DUR.hover, ease: EASE.exit },
                y: -6,
              }}
              initial={{ opacity: 0, y: 6 }}
              key={title}
              transition={{ duration: DUR.move, ease: EASE.out }}
            >
              {title}
            </motion.p>
          </AnimatePresence>
        </div>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}

/**
 * The floating tab bar, in thumb reach: Documents and Templates, the violet
 * + in the middle (it opens the "New" tray), then Search (the command menu)
 * and More (Activity, Contacts, Settings in a tray). A white pill inset
 * from the edges.
 */
export function PhoneBottomBar({
  currentSection,
  pathname,
}: {
  currentSection: ShellSection;
  pathname: string;
}) {
  const { openMenu } = useCommandMenu();
  const [newOpen, setNewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const inMore = phoneMoreItems.some((item) => item.section === currentSection);

  // Leaving the page closes the trays (a choice was made).
  if (openedAt !== pathname) {
    setOpenedAt(pathname);

    if (newOpen) {
      setNewOpen(false);
    }

    if (moreOpen) {
      setMoreOpen(false);
    }
  }

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-full bg-[rgb(var(--paper-rgb)/0.9)] shadow-(--material-paper) backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="grid h-16 grid-cols-5 items-center px-1.5">
        {phoneTabItems.map((item) => (
          <li className="flex justify-center" key={item.href}>
            <TabLink isActive={item.section === currentSection} item={item} />
          </li>
        ))}
        <li className="flex justify-center">
          <Tray onOpenChange={setNewOpen} open={newOpen}>
            <TrayTrigger asChild>
              <button
                aria-label="New"
                className="tactile mat-fill inline-flex size-12 items-center justify-center rounded-full bg-(--accent) text-(--on-accent) outline-none [--press-scale:0.9]"
                type="button"
              >
                <PlusIcon
                  aria-hidden="true"
                  className="size-5 transition-transform duration-(--spring-thumb-dur) ease-(--spring-thumb) data-[open]:rotate-45"
                  data-open={newOpen ? "" : undefined}
                  strokeWidth={2}
                />
              </button>
            </TrayTrigger>
            <NewTrayContent onChoose={() => setNewOpen(false)} />
          </Tray>
        </li>
        <li className="flex justify-center">
          <button
            className="tactile flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-full text-[0.6875rem] font-medium text-(--secondary) outline-none [--press-scale:0.9] active:bg-(--hover) focus-visible:shadow-(--focus-ring)"
            onClick={() => openMenu()}
            type="button"
          >
            <SearchIcon aria-hidden="true" className="size-5" />
            Search
          </button>
        </li>
        <li className="flex justify-center">
          <Tray onOpenChange={setMoreOpen} open={moreOpen}>
            <TrayTrigger asChild>
              <button
                aria-current={inMore ? "page" : undefined}
                className={cn(
                  "tactile flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-full text-[0.6875rem] font-medium outline-none [--press-scale:0.9] active:bg-(--hover) focus-visible:shadow-(--focus-ring)",
                  inMore ? "text-(--fg)" : "text-(--secondary)",
                )}
                type="button"
              >
                <EllipsisIcon
                  aria-hidden="true"
                  className={cn("size-5", inMore && "text-(--accent)")}
                />
                More
              </button>
            </TrayTrigger>
            <MoreTrayContent
              currentSection={currentSection}
              onChoose={() => setMoreOpen(false)}
            />
          </Tray>
        </li>
      </ul>
    </nav>
  );
}

function NewTrayContent({ onChoose }: { onChoose: () => void }) {
  return (
    <TrayContent size="md">
      <TrayHeader>
        <TrayTitle>New</TrayTitle>
      </TrayHeader>
      <TrayBody className="pb-4">
        <ul className="-mx-2 flex flex-col">
          {newChoices.map((choice) => (
            <li key={choice.id}>
              <Link
                className="tactile flex items-center gap-3.5 rounded-(--radius-well) px-2 py-2.5 outline-none [--press-scale:0.98] active:bg-(--hover) focus-visible:shadow-(--focus-ring) hover:bg-(--hover)"
                href={choice.href}
                onClick={onChoose}
              >
                <NewChoiceRow choice={choice} size="lg" />
              </Link>
            </li>
          ))}
        </ul>
      </TrayBody>
    </TrayContent>
  );
}

/** The places that are not daily: one tap away, never crowding the bar. */
function MoreTrayContent({
  currentSection,
  onChoose,
}: {
  currentSection: ShellSection;
  onChoose: () => void;
}) {
  return (
    <TrayContent size="md">
      <TrayHeader>
        <TrayTitle>More</TrayTitle>
      </TrayHeader>
      <TrayBody className="pb-4">
        <ul className="-mx-2 flex flex-col">
          {phoneMoreItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.section === currentSection;

            return (
              <li key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className="tactile flex items-center gap-3.5 rounded-(--radius-well) px-2 py-2.5 outline-none [--press-scale:0.98] active:bg-(--hover) focus-visible:shadow-(--focus-ring) hover:bg-(--hover)"
                  href={item.href}
                  onClick={onChoose}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-(--radius-well) shadow-[var(--surface-highlight-dim),inset_0_0_0_1px_rgb(var(--fg-rgb)/0.05)]",
                      isActive
                        ? "bg-(--accent-soft) text-(--accent-ink)"
                        : "bg-(--surface) text-(--fg)",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[0.9375rem] font-medium text-(--fg)">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span
                        aria-hidden="true"
                        className="text-[0.8125rem] leading-5 text-(--secondary)"
                      >
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </TrayBody>
    </TrayContent>
  );
}

function TabLink({
  isActive,
  item,
}: {
  isActive: boolean;
  item: ShellNavItem;
}) {
  const Icon = item.icon;

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "tactile flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-full text-[0.6875rem] font-medium outline-none [--press-scale:0.9] active:bg-(--hover) focus-visible:shadow-(--focus-ring)",
        isActive ? "text-(--fg)" : "text-(--secondary)",
      )}
      href={item.href}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 transition-colors duration-(--dur-hover)",
          isActive && "text-(--accent)",
        )}
      />
      {item.label}
    </Link>
  );
}
