"use client";

import { Command } from "cmdk";
import {
  ArrowLeftIcon,
  ClockIcon,
  CornerDownLeftIcon,
  FilePlus2Icon,
  FileTextIcon,
  KeyRoundIcon,
  LayoutTemplateIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  PaletteIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
  type IconComponent,
} from "@/components/ui/icons";
import { motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { topNavItems } from "@/components/layout/nav-items";
import { offsetWithin, useGlide } from "@/components/ui/glide";
import { Kbd } from "@/components/ui/kbd";

/*
 * The command menu (⌘K / Ctrl K).
 *
 * Keyboard first and instant: it opens and closes with no animation (it
 * is opened hundreds of times a day, usually from the keyboard), the
 * first row is already selected, ↑↓ move, ↵ opens, Esc closes and
 * Backspace on an empty field steps back out of a sub-list. Built on cmdk
 * for the listbox semantics and matching, inside a Radix dialog for focus
 * and the inert page behind.
 *
 * What it holds: your documents (matched on title and signer email), your
 * templates, the things you can start, and the places in Settings. The
 * documents and templates come from GET /api/command when it opens; what
 * you opened from here last comes first while the field is empty.
 */

export type CommandPage = "root" | "templates";

type CommandMenuContextValue = {
  openMenu: (page?: CommandPage) => void;
};

const CommandMenuContext = createContext<CommandMenuContextValue>({
  openMenu: () => undefined,
});

/** Open the command menu from anywhere inside the workspace shell. */
export function useCommandMenu() {
  return use(CommandMenuContext);
}

type CommandDocument = {
  emails: readonly string[];
  href?: string;
  id: string;
  status: string;
  statusLabel: string;
  title: string;
};

type CommandTemplate = {
  id: string;
  name: string;
  roleNames: readonly string[];
};

type CommandData = {
  documents: CommandDocument[];
  templates: CommandTemplate[];
};

type RecentItem = {
  href: string;
  id: string;
  kind: "document" | "template";
  label: string;
};

/** The same words the status pills use. */
const STATUS_WORDS: Record<string, string> = {
  completed: "Completed",
  declined: "Declined",
  draft: "Draft",
  expired: "Expired",
  sent: "Waiting",
  "template-draft": "Template draft",
  voided: "Voided",
};

const RECENT_KEY = "signudoc:command-recent";
const RECENT_LIMIT = 4;
/** Documents shown before you type anything. */
const IDLE_DOCUMENTS = 5;
/** Data younger than this is reused when the menu opens again. */
const FRESH_MS = 20_000;

function readRecent(): RecentItem[] {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_KEY) ?? "[]",
    ) as unknown;

    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is RecentItem =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as RecentItem).href === "string" &&
              typeof (item as RecentItem).label === "string" &&
              typeof (item as RecentItem).id === "string",
          )
          .slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function rememberRecent(item: RecentItem) {
  try {
    const next = [
      item,
      ...readRecent().filter(
        (existing) => !(existing.kind === item.kind && existing.id === item.id),
      ),
    ].slice(0, RECENT_LIMIT);

    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // A private window or blocked storage: recents are a nicety.
  }
}

type SettingsPlace = {
  adminOnly?: boolean;
  hash: string;
  icon: IconComponent;
  keywords: string[];
  label: string;
};

const SETTINGS_PLACES: SettingsPlace[] = [
  {
    hash: "profile",
    icon: UserRoundIcon,
    keywords: ["name"],
    label: "Profile",
  },
  {
    hash: "password",
    icon: KeyRoundIcon,
    keywords: ["change password"],
    label: "Password",
  },
  {
    hash: "two-step-sign-in",
    icon: SmartphoneIcon,
    keywords: ["2fa", "totp", "authenticator"],
    label: "Two-step sign-in",
  },
  {
    hash: "devices",
    icon: MonitorSmartphoneIcon,
    keywords: ["sessions", "sign out"],
    label: "Signed-in devices",
  },
  {
    adminOnly: true,
    hash: "people",
    icon: UsersIcon,
    keywords: ["team", "invite", "members"],
    label: "People",
  },
  {
    adminOnly: true,
    hash: "branding",
    icon: PaletteIcon,
    keywords: ["logo", "colour", "color"],
    label: "Branding",
  },
  {
    adminOnly: true,
    hash: "email",
    icon: MailIcon,
    keywords: ["smtp", "resend", "sender"],
    label: "Email",
  },
  {
    adminOnly: true,
    hash: "security",
    icon: ShieldCheckIcon,
    keywords: ["sso", "sign-in"],
    label: "Sign-in security",
  },
];

/**
 * Plain, predictable matching: the name first (from its start, then the
 * start of a word, then anywhere), then the extra words (signer emails,
 * role names, synonyms). Ids in an item's value never match.
 */
function commandFilter(_value: string, search: string, keywords?: string[]) {
  const needle = search.trim().toLowerCase();

  if (!needle) {
    return 1;
  }

  const [label = "", ...rest] = (keywords ?? []).map((word) =>
    word.toLowerCase(),
  );

  if (label.startsWith(needle)) {
    return 1;
  }

  if (label.split(/\s+/).some((word) => word.startsWith(needle))) {
    return 0.9;
  }

  if (label.includes(needle)) {
    return 0.8;
  }

  return rest.some((word) => word.includes(needle)) ? 0.6 : 0;
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;

  return Boolean(
    element &&
    (element.isContentEditable ||
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT"),
  );
}

export function CommandMenuProvider({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<CommandPage>("root");

  const openMenu = useCallback((nextPage: CommandPage = "root") => {
    setPage(nextPage);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        setPage("root");
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ openMenu }), [openMenu]);

  return (
    <CommandMenuContext value={value}>
      {children}
      <CommandMenuDialog
        isAdmin={isAdmin}
        onOpenChange={setOpen}
        onPageChange={setPage}
        open={open}
        page={page}
      />
    </CommandMenuContext>
  );
}

function useCommandData(open: boolean) {
  const [data, setData] = useState<CommandData | null>(null);
  const [failed, setFailed] = useState(false);
  const loadedAt = useRef(0);

  useEffect(() => {
    if (!open || Date.now() - loadedAt.current < FRESH_MS) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/command", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const payload = (await response.json()) as CommandData;

        loadedAt.current = Date.now();
        setData(payload);
        setFailed(false);
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") {
          setFailed(true);
        }
      });

    return () => controller.abort();
  }, [open]);

  return { data, failed };
}

function CommandMenuDialog({
  isAdmin,
  onOpenChange,
  onPageChange,
  open,
  page,
}: {
  isAdmin: boolean;
  onOpenChange: (open: boolean) => void;
  onPageChange: (page: CommandPage) => void;
  open: boolean;
  page: CommandPage;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const { data, failed } = useCommandData(open);

  const [wasOpen, setWasOpen] = useState(open);

  // Each time it opens: what you opened last; each time it closes: a
  // fresh field for next time.
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setRecent(readRecent());
    } else {
      setSearch("");
    }
  }

  const go = useCallback(
    (href: string, remember?: RecentItem) => {
      if (remember) {
        rememberRecent(remember);
      }

      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const query = search.trim();
  const documents = data?.documents ?? [];
  const templates = data?.templates ?? [];
  const shownDocuments = query ? documents : documents.slice(0, IDLE_DOCUMENTS);
  const loading = open && !data && !failed;

  function openPage(next: CommandPage) {
    setSearch("");
    onPageChange(next);
  }

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-(--overlay)" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-50 mx-auto flex max-h-[min(34rem,calc(100dvh-1rem))] w-auto max-w-[40rem] flex-col overflow-hidden rounded-(--radius-card) bg-(--paper) text-(--fg) shadow-(--shadow-tray) outline-none sm:top-[14vh]"
          data-slot="command-menu"
        >
          <DialogPrimitive.Title className="sr-only">
            Search and commands
          </DialogPrimitive.Title>
          <Command
            className="flex min-h-0 flex-1 flex-col"
            filter={commandFilter}
            // A fresh list per page, so its first row is selected.
            key={page}
            label="Search and commands"
            loop
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !search && page !== "root") {
                event.preventDefault();
                openPage("root");
              }
            }}
          >
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-(--divider) px-4 sm:px-5">
              {page === "root" ? (
                <SearchIcon
                  aria-hidden="true"
                  className="size-[1.125rem] shrink-0 text-(--secondary)"
                />
              ) : (
                <button
                  aria-label="Back to everything"
                  className="-ml-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-(--secondary) outline-none transition-[background-color,color] duration-(--dur-hover) hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring)"
                  onClick={() => openPage("root")}
                  type="button"
                >
                  <ArrowLeftIcon aria-hidden="true" className="size-4" />
                </button>
              )}
              <Command.Input
                autoFocus
                className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] text-(--fg) outline-none placeholder:text-(--placeholder) pointer-coarse:text-base"
                onValueChange={setSearch}
                placeholder={
                  page === "templates"
                    ? "Which template?"
                    : "Search documents, templates and actions"
                }
                value={search}
              />
              <Kbd className="max-sm:hidden">Esc</Kbd>
            </div>

            <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [scroll-padding-block:2.5rem] [&_[cmdk-list-sizer]]:relative [&_[cmdk-list-sizer]]:isolate [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-(--secondary)">
              <SelectionHighlight />
              <Command.Empty className="px-4 py-10 text-center text-sm text-(--secondary)">
                {loading
                  ? "Looking…"
                  : query
                    ? `Nothing matches “${query}”.`
                    : "Nothing here yet."}
              </Command.Empty>

              {page === "templates" ? (
                <Command.Group heading="Use a template">
                  {templates.map((template) => (
                    <CommandRow
                      description={template.roleNames.join(", ")}
                      icon={LayoutTemplateIcon}
                      key={template.id}
                      keywords={[...template.roleNames]}
                      label={template.name}
                      onSelect={() =>
                        go(
                          `/templates/${encodeURIComponent(template.id)}/use`,
                          {
                            href: `/templates/${encodeURIComponent(template.id)}`,
                            id: template.id,
                            kind: "template",
                            label: template.name,
                          },
                        )
                      }
                      value={`use-template ${template.id} ${template.name}`}
                    />
                  ))}
                  <CommandRow
                    icon={FilePlus2Icon}
                    label="New template"
                    onSelect={() => go("/templates/new")}
                    keywords={["create"]}
                    value="action-new-template"
                  />
                </Command.Group>
              ) : (
                <>
                  {!query && recent.length > 0 ? (
                    <Command.Group heading="Recent">
                      {recent.map((item) => (
                        <CommandRow
                          icon={ClockIcon}
                          key={`${item.kind}-${item.id}`}
                          label={item.label}
                          meta={
                            item.kind === "template" ? "Template" : "Document"
                          }
                          onSelect={() => go(item.href, item)}
                          value={`recent ${item.kind} ${item.id} ${item.label}`}
                        />
                      ))}
                    </Command.Group>
                  ) : null}

                  <Command.Group heading="Start">
                    <CommandRow
                      icon={PlusIcon}
                      label="New envelope"
                      onSelect={() => go("/envelopes/new")}
                      shortcut="N"
                      keywords={["upload", "send", "document"]}
                      value="action-new-envelope"
                    />
                    <CommandRow
                      icon={LayoutTemplateIcon}
                      label="Use a template"
                      onSelect={() => openPage("templates")}
                      keywords={["start from template"]}
                      value="action-use-template"
                    />
                    <CommandRow
                      icon={FilePlus2Icon}
                      label="New template"
                      onSelect={() => go("/templates/new")}
                      keywords={["create"]}
                      value="action-new-template-root"
                    />
                  </Command.Group>

                  {shownDocuments.length > 0 ? (
                    <Command.Group heading="Documents">
                      {shownDocuments.map((document) => (
                        <CommandRow
                          description={
                            query
                              ? document.emails.find((email) =>
                                  email
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                                )
                              : undefined
                          }
                          icon={FileTextIcon}
                          key={document.id}
                          keywords={[...document.emails]}
                          label={document.title}
                          meta={
                            STATUS_WORDS[document.status] ??
                            document.statusLabel
                          }
                          onSelect={() =>
                            go(
                              document.href ??
                                `/envelopes/${encodeURIComponent(document.id)}`,
                              {
                                href:
                                  document.href ??
                                  `/envelopes/${encodeURIComponent(document.id)}`,
                                id: document.id,
                                kind: "document",
                                label: document.title,
                              },
                            )
                          }
                          value={`document ${document.id}`}
                        />
                      ))}
                    </Command.Group>
                  ) : null}

                  {query && templates.length > 0 ? (
                    <Command.Group heading="Templates">
                      {templates.map((template) => (
                        <CommandRow
                          description={template.roleNames.join(", ")}
                          icon={LayoutTemplateIcon}
                          key={template.id}
                          keywords={[...template.roleNames]}
                          label={template.name}
                          onSelect={() =>
                            go(
                              `/templates/${encodeURIComponent(template.id)}`,
                              {
                                href: `/templates/${encodeURIComponent(template.id)}`,
                                id: template.id,
                                kind: "template",
                                label: template.name,
                              },
                            )
                          }
                          value={`template ${template.id}`}
                        />
                      ))}
                    </Command.Group>
                  ) : null}

                  <Command.Group heading="Go to">
                    {topNavItems.map((item) => (
                      <CommandRow
                        icon={item.icon}
                        key={item.href}
                        keywords={item.keywords}
                        label={item.label}
                        onSelect={() => go(item.href)}
                        value={`go-${item.section}`}
                      />
                    ))}
                    {SETTINGS_PLACES.filter(
                      (place) => isAdmin || !place.adminOnly,
                    ).map((place) => (
                      <CommandRow
                        icon={place.icon}
                        key={place.hash}
                        keywords={["settings", ...place.keywords]}
                        label={place.label}
                        meta="Settings"
                        onSelect={() => go(`/settings#${place.hash}`)}
                        value={`settings-${place.hash}`}
                      />
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>

            <div className="flex h-11 shrink-0 items-center gap-4 border-t border-(--divider) px-4 text-xs text-(--secondary) max-sm:hidden sm:px-5">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                to move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeftIcon aria-hidden="true" className="size-3" />
                </Kbd>
                to open
              </span>
              {page !== "root" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Kbd>⌫</Kbd>
                  back
                </span>
              ) : null}
              {failed ? (
                <span className="ml-auto" role="status">
                  Documents couldn’t load. Actions still work.
                </span>
              ) : null}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * One soft pill behind the selected row that slides between rows as the
 * arrow keys or the pointer move (ui/glide.tsx), instead of each row
 * flashing its own background. The menu itself opens without animation:
 * it is usually opened from the keyboard, and should be there at once.
 */
function SelectionHighlight() {
  // The container is the list's sizer (cmdk's inner wrapper, this layer's
  // parent): the box the rows sit in.
  const layerRef = useRef<HTMLSpanElement>(null);
  const glide = useGlide(null, layerRef, {
    attributes: ["data-selected"],
    axis: "y",
    onPlace: (active, layer) => {
      if (!active) {
        return;
      }

      const parent = (layer.offsetParent as HTMLElement | null) ?? active;

      layer.style.left = `${offsetWithin(active, parent).left}px`;
      layer.style.width = `${active.offsetWidth}px`;
    },
    selector: '[cmdk-item][data-selected="true"]',
  });

  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 -z-10 rounded-(--radius-well) bg-(--hover) will-change-transform"
      data-slot="command-highlight"
      ref={layerRef}
      style={{
        height: glide.size,
        opacity: glide.opacity,
        y: glide.position,
      }}
    />
  );
}

function CommandRow({
  description,
  icon: Icon,
  keywords,
  label,
  meta,
  onSelect,
  shortcut,
  value,
}: {
  description?: string;
  icon: IconComponent;
  keywords?: string[];
  label: string;
  meta?: string;
  onSelect: () => void;
  shortcut?: string;
  value: string;
}) {
  return (
    <Command.Item
      className={cn(
        "group/row flex min-h-11 cursor-default items-center gap-3 rounded-(--radius-well) px-2.5 py-1.5 text-sm text-(--fg) outline-none select-none",
        "data-[disabled=true]:opacity-50",
      )}
      keywords={[label, ...(keywords ?? [])]}
      onSelect={onSelect}
      value={value}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--surface) text-(--secondary) group-data-[selected=true]/row:bg-(--paper) group-data-[selected=true]/row:text-(--accent) group-data-[selected=true]/row:shadow-(--shadow-thumb)">
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{label}</span>
        {description ? (
          <span className="truncate text-xs text-(--secondary)">
            {description}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span className="shrink-0 text-xs text-(--secondary)">{meta}</span>
      ) : null}
      {shortcut ? <Kbd className="shrink-0">{shortcut}</Kbd> : null}
    </Command.Item>
  );
}

/** Is a keyboard event coming from a field? (Shared with the shell.) */
export { isEditableTarget };
